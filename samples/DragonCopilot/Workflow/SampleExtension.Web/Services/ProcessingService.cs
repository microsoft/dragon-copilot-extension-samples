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
            SchemaVersion = "0.1",
            Document = note.Document,
        };

        foreach(var entity in entities)
        {
            sampleEntities.Resources?.Add(entity);
        }

        // Create adaptive card version
        var adaptiveCardResponse = new DspResponse
        {
            SchemaVersion = "0.1",
            Document = note.Document,
        };
        adaptiveCardResponse.Resources?.Add(CreateAdaptiveCardResource(entities));

        return Task.FromResult((sampleEntities, adaptiveCardResponse));
    }

    private static List<IResource> ExtractClinicalEntities(Note note)
    {
        var entities = new List<IResource>();

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
                        entities.Add(CreateVitalSignObservation(145.0, "mmHg"));
                    }

                    // Diabetes detection
                    var diabetesMatch = FindEntityMatch(resource.Content, ["DIABETES", "DIABETIC"]);
                    if (diabetesMatch != null)
                    {
                        entities.Add(CreateMedicalCodeExample("E11.9", "Type 2 diabetes mellitus without complications"));
                    }

                    // Medication detection
                    var medicationMatch = FindEntityMatch(resource.Content, ["MEDICATION", "PRESCRIBED", "TAKING", "METFORMIN"]);
                    if (medicationMatch != null)
                    {
                        entities.Add(CreateObservationConceptExample("Prescription medication detected", "medication-concept-001"));
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

    private static VisualizationResource CreateAdaptiveCardResource(List<IResource> entities)
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
            foreach (var entity in entities)
            {
                var entityType = GetEntityTypeFromResource(entity);
                var entityName = GetEntityNameFromResource(entity);
                var entityValue = GetEntityValueFromResource(entity);

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
                                            text = GetEntityIcon(entityType),
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
                                            text = $"**{GetEntityTypeDisplayName(entityType)}**",
                                            weight = "Bolder",
                                            size = "Medium",
                                            spacing = "None"
                                        },
                                        new
                                        {
                                            type = "TextBlock",
                                            text = entityName,
                                            color = "Accent",
                                            spacing = "None"
                                        },
                                        new
                                        {
                                            type = "TextBlock",
                                            text = entityValue,
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

        return new VisualizationResource
        {
            Id = Guid.NewGuid().ToString(),
            Type = "AdaptiveCard",
            Subtype = VisualizationSubtype.Note,
            CardTitle = "Clinical Entities Extracted",
            AdaptiveCardPayload = new
            {
                type = "AdaptiveCard",
                version = "1.3",
                body = bodyElements.ToArray()
            },
            Actions = new List<VisualizationAction>
            {
                new()
                {
                    Title = "Accept Analysis",
                    Action = VisualizationActionType.Accept,
                    ActionType = ActionButtonType.Primary
                },
                new()
                {
                    Title = "Copy to Note",
                    Action = VisualizationActionType.Copy,
                    ActionType = ActionButtonType.Secondary,
                    Code = "CLINICAL ENTITY ANALYSIS\n\nEntities detected:\n" +
                           string.Join("\n", entities.Select(e => $"- {GetEntityNameFromResource(e)} ({GetEntityTypeFromResource(e)})"))
                },
                new()
                {
                    Title = "Reject Analysis",
                    Action = VisualizationActionType.Reject,
                    ActionType = ActionButtonType.Tertiary
                }
            },
            PayloadSources = new List<PayloadSource>
            {
                new()
                {
                    Identifier = Guid.NewGuid().ToString(),
                    Description = "Sample Extension Clinical Entity Extractor",
                    Url = new Uri("https://localhost/api/process")
                }
            },
            DragonCopilotCopyData = "Clinical entities extracted from note content"
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

    /// <summary>
    /// Creates a sample medical code resource
    /// </summary>
    /// <param name="codeValue">The medical code value</param>
    /// <param name="description">Description of the code</param>
    /// <returns>A medical code resource</returns>
    private static MedicalCode CreateMedicalCodeExample(string codeValue, string description)
    {
        return new MedicalCode
        {
            Id = Guid.NewGuid().ToString(),
            Context = new Context
            {
                Id = "medical-code-context",
                ContentType = "medical-code",
                DisplayDescription = "Medical coding for clinical entities"
            },
            Code = new CodeInfo
            {
                Identifier = codeValue,
                Description = description,
                System = "ICD-10-CM",
                SystemUrl = new Uri("http://hl7.org/fhir/sid/icd-10-cm")
            },
            Priority = Priority.Medium,
            Reason = "Detected from clinical documentation"
        };
    }

    /// <summary>
    /// Creates a sample observation number resource for vital signs
    /// </summary>
    /// <param name="value">The numeric value</param>
    /// <param name="unit">The unit of measurement</param>
    /// <returns>An observation number resource</returns>
    private static ObservationNumber CreateVitalSignObservation(double value, string unit)
    {
        return new ObservationNumber
        {
            Id = Guid.NewGuid().ToString(),
            Context = new Context
            {
                Id = "vital-sign-context",
                ContentType = "vital-sign",
                DisplayDescription = "Vital sign measurement"
            },
            Value = value,
            ValueUnit = unit,
            Priority = Priority.High
        };
    }

    /// <summary>
    /// Creates a sample observation concept resource
    /// </summary>
    /// <param name="conceptText">The concept text</param>
    /// <param name="conceptId">The concept identifier</param>
    /// <returns>An observation concept resource</returns>
    private static ObservationConcept CreateObservationConceptExample(string conceptText, string conceptId)
    {
        return new ObservationConcept
        {
            Id = Guid.NewGuid().ToString(),
            Context = new Context
            {
                Id = "observation-context",
                ContentType = "clinical-observation",
                DisplayDescription = "Clinical observation finding"
            },
            Value = new ObservationValue
            {
                Text = conceptText,
                ConceptId = conceptId
            },
            Priority = Priority.Medium
        };
    }

    /// <summary>
    /// Gets the entity type string from an IResource
    /// </summary>
    private static string GetEntityTypeFromResource(IResource resource)
    {
        return resource switch
        {
            MedicalCode => "CONDITION",
            ObservationNumber => "VITAL_SIGN",
            ObservationConcept => "MEDICATION",
            _ => "CLINICAL_ENTITY"
        };
    }

    /// <summary>
    /// Gets the entity name from an IResource
    /// </summary>
    private static string GetEntityNameFromResource(IResource resource)
    {
        return resource switch
        {
            MedicalCode mc => mc.Code.Description ?? "Medical Code",
            ObservationNumber on => $"Numeric Observation ({on.Value} {on.ValueUnit})",
            ObservationConcept oc => oc.Value?.Text ?? "Clinical Observation",
            _ => "Unknown Entity"
        };
    }

    /// <summary>
    /// Gets the entity value description from an IResource
    /// </summary>
    private static string GetEntityValueFromResource(IResource resource)
    {
        return resource switch
        {
            MedicalCode mc => $"Code: {mc.Code.Identifier} - {mc.Reason ?? "No additional details"}",
            ObservationNumber on => $"Value: {on.Value} {on.ValueUnit ?? ""} (Priority: {on.Priority})",
            ObservationConcept oc => $"Concept: {oc.Value?.ConceptId ?? "N/A"} (Priority: {oc.Priority})",
            _ => "No additional information available"
        };
    }
}
