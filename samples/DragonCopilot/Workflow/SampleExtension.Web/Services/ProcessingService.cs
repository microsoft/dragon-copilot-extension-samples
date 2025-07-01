// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Dragon.Copilot.Models;
using SampleExtension.Web.Extensions;

namespace SampleExtension.Web.Services;

/// <summary>
/// Implementation of the processing service for Dragon Standard payloads
/// </summary>
public class ProcessingService : IProcessingService
{
    private readonly ILogger<ProcessingService> _logger;

    /// <summary>
    /// Constructor for the processing service
    /// </summary>
    /// <param name="logger">The logger</param>
    public ProcessingService(ILogger<ProcessingService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ProcessResponse> ProcessAsync(
        DragonStandardPayload payload,
        string? requestId = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(payload, nameof(payload));

        try
        {
            _logger.LogProcessingStart(requestId, correlationId);

            var processResponse = new ProcessResponse();

            // Process Note if present
            if (payload.Note != null)
            {
                var noteResponse = await ProcessNoteAsync(payload.Note, payload.SessionData, cancellationToken).ConfigureAwait(false);
                processResponse.Payload["sample-entities"] = noteResponse.SampleEntities;
                processResponse.Payload["sample-entities-adaptive-card"] = noteResponse.SampleEntitiesAdaptiveCard;
            }

            // TODO: Add processing for other payload types (Transcript, IterativeTranscript, IterativeAudio)


            processResponse.Success = true;
            processResponse.Message = "Payload processed successfully";

            return processResponse;
        }
#pragma warning disable CA1031
        catch (Exception ex)
#pragma warning restore CA1031
        {
            _logger.LogProcessingException(ex, requestId);

            return new ProcessResponse
            {
                Success = false,
                Message = "An error occurred while processing the payload",
            };
        }
    }

    private static async Task<(DspResponse SampleEntities, DspResponse SampleEntitiesAdaptiveCard)> ProcessNoteAsync(
        Note note,
        SessionData sessionData,
        CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken).ConfigureAwait(false); // Simulate async processing

        // Extract sample clinical entities from the note
        var entities = ExtractClinicalEntities(note);

        // Create the sample entities DSP response
        var sampleEntities = new DspResponse
        {
            PayloadVersion = "1.0.0",
            SchemaVersion = "0.1",
            Priority = "medium",
            Encounter = note.Encounter,
            Document = note.Document,
        };

        foreach(var entity in entities)
        {
            sampleEntities.Resources.Add(entity);
        }

        // Create adaptive card version
        var adaptiveCardResponse = new DspResponse
        {
            PayloadVersion = "1.0.0",
            SchemaVersion = "0.1",
            Priority = "medium",
            Encounter = note.Encounter,
            Document = note.Document,
        };
        adaptiveCardResponse.Resources.Add(CreateAdaptiveCardResource(entities));

        return (sampleEntities, adaptiveCardResponse);
    }

    private static List<object> ExtractClinicalEntities(Note note)
    {
        var entities = new List<object>();

        // Sample entity extraction logic - in a real implementation,
        // this would use NLP or other AI services to extract entities
        if (note.Resources != null)
        {
            foreach (var resource in note.Resources)
            {
                if (!string.IsNullOrEmpty(resource.Content))
                {
                    // Simple keyword-based entity extraction for demonstration
                    var content = resource.Content.ToUpperInvariant();

                    if (content.Contains("BLOOD PRESSURE", StringComparison.InvariantCultureIgnoreCase) || content.Contains("BP", StringComparison.InvariantCultureIgnoreCase))
                    {
                        entities.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            type = "vital_sign",
                            entity = "blood_pressure",
                            value = string.Concat("extracted from: ", resource.Content.AsSpan(0, Math.Min(50, resource.Content.Length)))
                        });
                    }

                    if (content.Contains("DIABETES", StringComparison.InvariantCultureIgnoreCase) || content.Contains("DIABETIC", StringComparison.InvariantCultureIgnoreCase))
                    {
                        entities.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            type = "condition",
                            entity = "diabetes",
                            value = string.Concat("extracted from: ", resource.Content.AsSpan(0, Math.Min(50, resource.Content.Length)))
                        });
                    }

                    if (content.Contains("MEDICATION", StringComparison.InvariantCultureIgnoreCase) || content.Contains("PRESCRIBED", StringComparison.InvariantCultureIgnoreCase))
                    {
                        entities.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            type = "medication",
                            entity = "prescription",
                            value = string.Concat("extracted from: ", resource.Content.AsSpan(0, Math.Min(50, resource.Content.Length)))
                        });
                    }
                }
            }
        }

        return entities;
    }

    private static object CreateAdaptiveCardResource(List<object> entities)
    {
        return new
        {
            id = Guid.NewGuid().ToString(),
            type = "AdaptiveCard",
            adaptive_card_payload = new
            {
                type = "AdaptiveCard",
                version = "1.3",
                body = new object[]
                {
                    new
                    {
                        type = "TextBlock",
                        text = "Clinical Entities Extracted",
                        weight = "Bolder",
                        size = "Medium"
                    },
                    new
                    {
                        type = "TextBlock",
                        text = $"Found {entities.Count} clinical entities in the note:",
                        wrap = true
                    },
                    new
                    {
                        type = "FactSet",
                        facts = entities.Select((entity, index) => new
                        {
                            title = $"Entity {index + 1}:",
                            value = entity.ToString()
                        }).ToArray()
                    }
                }
            },
            payloadSources = new object[]
            {
                new
                {
                    identifier = Guid.NewGuid().ToString(),
                    description = "Sample Extension Clinical Entity Extractor",
                    url = "https://localhost/api/process"
                }
            },
            dragonCopilotCopyData = "Clinical entities extracted from note content"
        };
    }
}
