// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DragonBackendSimulator.Web.Models;
using Dragon.Copilot.Models;
using Microsoft.Extensions.Options;
using DragonBackendSimulator.Web.Configuration;
using DragonBackendSimulator.Web.Extensions;
using Microsoft.Extensions.Logging;

namespace DragonBackendSimulator.Web.Services;

public sealed class EncounterService : IEncounterService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<EncounterService> _logger;
    private readonly ExtensionApiOptions _extensionApiOptions;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public EncounterService(
        IHttpClientFactory httpClientFactory,
        ILogger<EncounterService> logger,
        IOptions<ExtensionApiOptions> options)
    {
        ArgumentNullException.ThrowIfNull(httpClientFactory, nameof(httpClientFactory));
        ArgumentNullException.ThrowIfNull(logger, nameof(logger));
        ArgumentNullException.ThrowIfNull(options?.Value, nameof(options));

        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _extensionApiOptions = options.Value;
    }

    public async Task<ExtensionResponse> CallExtensionAsync(EncounterSimulationRequest simulationRequest, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(simulationRequest, nameof(simulationRequest));

        var httpClient = _httpClientFactory.CreateClient("EncounterApi");

        // Create the encounter object
        var encounter = new ExtensionResponse
        {
            Id = Guid.NewGuid(),
            Name = simulationRequest.Name,
            Description = simulationRequest.Description,
            CreatedAt = DateTime.UtcNow,
            Status = EncounterStatus.Created
        };

        _logger.LogEncounterStart(encounter.Id, encounter.Name);
        try
        {
            // Create a DragonStandardPayload with a Note for the extension
            var sessionData = new SessionData
            {
                CorrelationId = encounter.Id.ToString(),
                SessionStart = encounter.CreatedAt,
                TenantId = "dragon-backend-simulator"
            };

            var note = new Note
            {
                PayloadVersion = "1.0",
                SchemaVersion = "1.0",
                Language = "en-US",
                Priority = "normal",
                Document = new Document
                {
                    Title = simulationRequest.Name,
                    Type = new DocumentType
                    {
                        Text = "Encounter Simulation"
                    }
                },
                Resources = new List<ClinicalDocumentSection>
                {
                    new ClinicalDocumentSection
                    {
                        LegacyId = encounter.Id.ToString(),
                        Content = $"Encounter: {simulationRequest.Name}" +
                                 (string.IsNullOrEmpty(simulationRequest.Description) ? "" : $" - {simulationRequest.Description}")
                    }
                }
            };

            var dragonPayload = new DragonStandardPayload
            {
                SessionData = sessionData,
                Note = note
            };

            var jsonContent = JsonSerializer.Serialize(dragonPayload, JsonOptions);
            using var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            _logger.LogExtensionSuccess(encounter.Id, _extensionApiOptions.BaseUrl, _extensionApiOptions.Path);

            var response = await httpClient.PostAsync(new Uri(_extensionApiOptions.Path, UriKind.Relative), content, cancellationToken).ConfigureAwait(false);

            // Update encounter status based on API response
            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                encounter.Status = EncounterStatus.Completed;
                encounter.ExternalApiResponse = responseContent;
                encounter.StatusCode = (int)response.StatusCode;

                _logger.LogExtensionSuccess(encounter.Id, encounter.StatusCode);

                // Try to parse the response using the shared ProcessResponse model
                try
                {
                    var processResponse = JsonSerializer.Deserialize<ProcessResponse>(responseContent, JsonOptions);

                    if (processResponse != null && !processResponse.Success)
                    {
                        encounter.Status = EncounterStatus.Failed;
                        encounter.ErrorMessage = processResponse.Message ?? "Extension processing failed";
                    }
                }
                catch (JsonException)
                {
                    // If we can't parse the response as ProcessResponse, that's OK - we'll keep the successful status
                }
            }
            else
            {
                encounter.Status = EncounterStatus.Failed;
                encounter.StatusCode = (int)response.StatusCode;
                encounter.ErrorMessage = $"Extension API call failed with status {response.StatusCode}: {response.ReasonPhrase}";

                _logger.LogExtensionFailure(encounter.Id, encounter.StatusCode, response.ReasonPhrase ?? "Unknown error");
            }
        }
#pragma warning disable CA1031
        catch (Exception ex)
#pragma warning restore CA1031
        {
            encounter.Status = EncounterStatus.Failed;
            encounter.ErrorMessage = ex.Message;
            _logger.LogExtensionException(ex, encounter.Id);
        }

        encounter.CompletedAt = DateTime.UtcNow;
        return encounter;
    }
}
