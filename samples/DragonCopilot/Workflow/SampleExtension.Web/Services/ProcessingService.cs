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

    private static Task<(DspResponse SampleEntities, DspResponse SampleEntitiesAdaptiveCard)> ProcessNoteAsync(
        Note note,
        SessionData sessionData,
        CancellationToken cancellationToken)
    {
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
            sampleEntities.Resources?.Add(entity);
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
        adaptiveCardResponse.Resources?.Add(CreateAdaptiveCardResource(entities));

        return Task.FromResult((sampleEntities, adaptiveCardResponse));
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
                    // Blood pressure detection
                    var bpMatch = FindEntityMatch(resource.Content, ["BLOOD PRESSURE", "BP"]);
                    if (bpMatch != null)
                    {
                        entities.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            type = "vital_sign",
                            entity = "blood_pressure",
                            value = $"extracted from: \"{bpMatch}\""
                        });
                    }

                    // Diabetes detection
                    var diabetesMatch = FindEntityMatch(resource.Content, ["DIABETES", "DIABETIC"]);
                    if (diabetesMatch != null)
                    {
                        entities.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            type = "condition",
                            entity = "diabetes",
                            value = $"extracted from: \"{diabetesMatch}\""
                        });
                    }

                    // Medication detection
                    var medicationMatch = FindEntityMatch(resource.Content, ["MEDICATION", "PRESCRIBED", "TAKING"]);
                    if (medicationMatch != null)
                    {
                        entities.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            type = "medication",
                            entity = "prescription",
                            value = $"extracted from: \"{medicationMatch}\""
                        });
                    }
                }
            }
        }

        return entities;
    }

    private static string? FindEntityMatch(string content, string[] keywords)
    {
        const int contextLength = 25;
        var contentUpper = content.ToUpperInvariant();

        foreach (var keyword in keywords)
        {
            var index = contentUpper.IndexOf(keyword.ToUpperInvariant(), StringComparison.InvariantCultureIgnoreCase);
            if (index >= 0)
            {
                // Calculate the start and end positions for context
                var startPos = Math.Max(0, index - contextLength);
                var endPos = Math.Min(content.Length, index + keyword.Length + contextLength);

                // Extract the text with context
                var extractedText = content.Substring(startPos, endPos - startPos);

                // Clean up the extracted text
                extractedText = extractedText.Trim();

                // If we started in the middle of a word, try to find the beginning of the word
                if (startPos > 0 && !char.IsWhiteSpace(content[startPos - 1]))
                {
                    var wordStart = extractedText.IndexOf(' ', StringComparison.Ordinal);
                    if (wordStart > 0 && wordStart < contextLength)
                    {
                        extractedText = extractedText.Substring(wordStart + 1);
                    }
                }

                // If we ended in the middle of a word, try to find the end of the word
                if (endPos < content.Length && !char.IsWhiteSpace(content[endPos]))
                {
                    var wordEnd = extractedText.LastIndexOf(' ');
                    if (wordEnd > extractedText.Length - contextLength && wordEnd > 0)
                    {
                        extractedText = extractedText.Substring(0, wordEnd);
                    }
                }

                return extractedText;
            }
        }

        return null;
    }

    private static object CreateAdaptiveCardResource(List<object> entities)
    {
        // Create the body elements list
        var bodyElements = new List<object>
        {
            // Header
            new
            {
                type = "TextBlock",
                text = "🔍 Clinical Entities Extracted",
                weight = "Bolder",
                size = "Large",
                color = "Accent"
            },
            new
            {
                type = "TextBlock",
                text = $"Found {entities.Count} clinical {(entities.Count == 1 ? "entity" : "entities")} in the note",
                wrap = true,
                size = "Medium",
                spacing = "Small"
            }
        };

        // Add entities as individual containers if any found
        if (entities.Count > 0)
        {
            foreach (dynamic entity in entities)
            {
                var entityContainer = new
                {
                    type = "Container",
                    style = "emphasis",
                    spacing = "Medium",
                    items = new object[]
                    {
                        new
                        {
                            type = "ColumnSet",
                            columns = new object[]
                            {
                                new
                                {
                                    type = "Column",
                                    width = "auto",
                                    items = new object[]
                                    {
                                        new
                                        {
                                            type = "TextBlock",
                                            text = GetEntityIcon(entity.type?.ToString()),
                                            size = "Large",
                                            spacing = "None"
                                        }
                                    }
                                },
                                new
                                {
                                    type = "Column",
                                    width = "stretch",
                                    items = new object[]
                                    {
                                        new
                                        {
                                            type = "TextBlock",
                                            text = $"**{GetEntityTypeDisplayName(entity.type?.ToString())}**",
                                            weight = "Bolder",
                                            size = "Medium",
                                            spacing = "None"
                                        },
                                        new
                                        {
                                            type = "TextBlock",
                                            text = entity.entity?.ToString() ?? "Unknown",
                                            color = "Accent",
                                            spacing = "None"
                                        },
                                        new
                                        {
                                            type = "TextBlock",
                                            text = entity.value?.ToString() ?? "No additional information",
                                            wrap = true,
                                            size = "Small",
                                            color = "Default",
                                            spacing = "Small"
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
                bodyElements.Add(entityContainer);
            }
        }
        else
        {
            // No entities found message
            bodyElements.Add(new
            {
                type = "Container",
                style = "attention",
                items = new object[]
                {
                    new
                    {
                        type = "TextBlock",
                        text = "ℹ️ No clinical entities were detected in this note.",
                        wrap = true,
                        horizontalAlignment = "Center"
                    }
                }
            });
        }

        // Add footer
        bodyElements.Add(new
        {
            type = "TextBlock",
            text = $"Processed at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC",
            size = "Small",
            horizontalAlignment = "Right",
            spacing = "Medium"
        });

        return new
        {
            id = Guid.NewGuid().ToString(),
            type = "AdaptiveCard",
            adaptive_card_payload = new
            {
                type = "AdaptiveCard",
                version = "1.3",
                body = bodyElements.ToArray()
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

    private static string GetEntityIcon(string? entityType)
    {
        return entityType?.ToUpperInvariant() switch
        {
            "VITAL_SIGN" => "💓",
            "CONDITION" => "🏥",
            "MEDICATION" => "💊",
            "PROCEDURE" => "🔬",
            "ALLERGY" => "⚠️",
            "SYMPTOM" => "🤒",
            _ => "📋"
        };
    }

    private static string GetEntityTypeDisplayName(string? entityType)
    {
        return entityType?.ToUpperInvariant() switch
        {
            "VITAL_SIGN" => "Vital Sign",
            "CONDITION" => "Medical Condition",
            "MEDICATION" => "Medication",
            "PROCEDURE" => "Medical Procedure",
            "ALLERGY" => "Allergy",
            "SYMPTOM" => "Symptom",
            _ => "Clinical Entity"
        };
    }
}
