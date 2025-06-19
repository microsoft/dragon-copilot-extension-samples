using System.Text.Json;
using DragonBackendSimulator.Web.Models;
using Microsoft.Extensions.Options;
using DragonBackendSimulator.Web.Configuration;

namespace DragonBackendSimulator.Web.Services;

public class EncounterService : IEncounterService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<EncounterService> _logger;
    private readonly ExtensionApiOptions _extensionApiOptions;

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

        _logger.LogInformation("Simulating encounter {EncounterId} with name '{Name}'", encounter.Id, encounter.Name);        try
        {
            // Create a payload that matches the ProcessRequest model expected by the extension
            var payload = new
            {
                requestId = Guid.NewGuid(),
                encounterId = encounter.Id,
                data = $"Encounter: {encounter.Name}" + (string.IsNullOrEmpty(encounter.Description) ? "" : $" - {encounter.Description}"),
                metadata = new Dictionary<string, object>
                {
                    { "source", "DragonBackendSimulator" },
                    { "encounterName", encounter.Name },
                    { "encounterDescription", encounter.Description ?? "" },
                    { "simulatorVersion", "1.0.0" }
                },
                createdAt = encounter.CreatedAt
            };

            var jsonContent = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            _logger.LogInformation("Calling extension API for encounter {EncounterId} at {ApiUrl}{ApiPath}",
                encounter.Id, _extensionApiOptions.BaseUrl, _extensionApiOptions.Path);

            var response = await httpClient.PostAsync(_extensionApiOptions.Path, content, cancellationToken);

            // Update encounter status based on API response
            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                encounter.Status = EncounterStatus.Completed;
                encounter.ExternalApiResponse = responseContent;
                encounter.StatusCode = (int)response.StatusCode;

                _logger.LogInformation("Encounter {EncounterId} completed successfully with status {StatusCode}",
                    encounter.Id, encounter.StatusCode);

                // Try to parse the response to extract additional info
                try
                {
                    var processResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (processResponse.TryGetProperty("success", out var successProperty) &&
                        successProperty.GetBoolean() == false)
                    {
                        encounter.Status = EncounterStatus.Failed;
                        if (processResponse.TryGetProperty("errorMessage", out var errorProperty))
                        {
                            encounter.ErrorMessage = errorProperty.GetString();
                        }
                    }
                }
                catch (JsonException)
                {
                    // If we can't parse the response, that's OK - we'll keep the successful status
                }
            }
            else
            {
                encounter.Status = EncounterStatus.Failed;
                encounter.StatusCode = (int)response.StatusCode;
                encounter.ErrorMessage = $"Extension API call failed with status {response.StatusCode}: {response.ReasonPhrase}";

                _logger.LogWarning("Encounter {EncounterId} failed with status {StatusCode}: {ReasonPhrase}",
                    encounter.Id, encounter.StatusCode, response.ReasonPhrase);
            }
        }
        catch (Exception ex)
        {
            encounter.Status = EncounterStatus.Failed;
            encounter.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Error occurred while processing encounter {EncounterId}", encounter.Id);
        }

        encounter.CompletedAt = DateTime.UtcNow;
        return encounter;
    }
}
