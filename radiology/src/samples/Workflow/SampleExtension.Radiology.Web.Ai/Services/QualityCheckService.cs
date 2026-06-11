using System.Text.Json;
using Dragon.Copilot.Radiology.Models;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using SampleExtension.Radiology.Web.Ai.Configuration;

namespace SampleExtension.Radiology.Web.Ai.Services;

/// <summary>
/// Quality-check service that selects an inference provider in this priority order:
///   1. Azure OpenAI (if endpoint, key, and deployment are configured)
///   2. Foundry Local on-device model (if enabled)
/// If neither is available, throws <see cref="InvalidOperationException"/>.
/// </summary>
public sealed class QualityCheckService : IQualityCheckService
{
    /// <summary>
    /// System prompt shared by all model-backed providers (Azure OpenAI and Foundry Local).
    /// </summary>
    private const string SystemPrompt = """

        You are a highly accurate medical transcription and coding assistant for radiology. You review radiology reports produced by speech-to-text software and surface two kinds of recommendations:

        1. Clinical issues - transcription errors, medical inaccuracies, or ambiguous wording that could affect patient care. Illustrative (non-anchoring) examples:
           - Misheard or phonetically similar words (e.g., "paddock steatosis" vs. "hepatic steatosis")
           - Incorrect numbers or dates (e.g., "for views" vs. "4 views", "Nine 20 5/24" vs. "9/25/24")
           - Findings inconsistent with the patient's age or biological sex (e.g., prostate findings on a Female patient, pediatric only findings on an adult)

        2. Billing issues - documentation gaps that affect accurate charge capture or CPT code selection. Illustrative examples:
           - Missing or ambiguous laterality (left vs. right) on a procedure
           - Missing contrast indication when the study title implies contrast use
           - Missing view count on a radiograph (affects CPT selection, e.g., 71045-71048 for chest X-ray)
           - Procedure performed but not clearly documented in the impression

        Input format (JSON):
        {
          "report": {"reportText": "<radiology report text>"},
          "patientInformation": {
            "dateOfBirth": "<YYYY-MM-DD>",
            "biologicalSex": "<Male|Female|Other>"
          }
        }

        Output format (JSON) respond with a single JSON object matching this schema exactly:
        {
          "qualityCheckResult": {
            "recommendations": [
              {
                "qualityCheckType": "Clinical" | "Billing",
                "description": "<Suggested correction or improvement>",
                "reason": "<Why this correction is needed>",
                "severityScorePercent": <integer 0-100>,
                "provenance": [
                  {
                    "text": "<exact substring from reportText>",
                    "startPosition": <integer>,
                    "endPosition": <integer>
                  }
                ]
              }
            ]
          }
        }

        Field semantics:
        - provenance.text MUST be an exact substring of reportText (same characters, same casing); provenance MUST contain at least one entry pointing to that span.
        - startPosition is the 0-based character index of provenance.text in reportText; endPosition is end-exclusive, so reportText.substring(startPosition, endPosition) == provenance.text and endPosition - startPosition == text.Length.
        - severityScorePercent rubric: 0-24 trivial / stylistic, 25-49 minor (no clinical or billing impact), 50-74 moderate (affects clarity or CPT code selection), 75-100 critical (affects patient care or correct charge capture).
        
        Quality rules:
        - Only flag issues clearly supported by reportText and patientInformation; do not invent findings, codes, measurements, or terminology not present in the input. If uncertain, omit the recommendation.
        - Do not duplicate recommendations; merge overlapping issues into a single entry.

        Response rules:
        - Respond with a single JSON object. No prose, no commentary, no Markdown code fences.
        - The top-level object MUST have exactly one key: "qualityCheckResult".
        - If no issues are found, or if the input is not valid JSON in the expected shape, return exactly: {"qualityCheckResult": {"recommendations": []}}
        """;

    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly ILogger<QualityCheckService> _logger;
    private readonly IAzureOpenAIService _azureOpenAi;
    private readonly IFoundryLocalService _foundryLocal;
    private readonly FoundryLocalSettings _foundryLocalSettings;

    public QualityCheckService(
        ILogger<QualityCheckService> logger,
        IAzureOpenAIService azureOpenAi,
        IFoundryLocalService foundryLocal,
        IOptions<FoundryLocalSettings> foundryLocalOptions)
    {
        ArgumentNullException.ThrowIfNull(logger);
        ArgumentNullException.ThrowIfNull(azureOpenAi);
        ArgumentNullException.ThrowIfNull(foundryLocal);
        ArgumentNullException.ThrowIfNull(foundryLocalOptions);

        _logger = logger;
        _azureOpenAi = azureOpenAi;
        _foundryLocal = foundryLocal;
        _foundryLocalSettings = foundryLocalOptions.Value;
    }

    /// <inheritdoc />
    public ProcessResponse Process(ProcessRequest payload)
    {
        ArgumentNullException.ThrowIfNull(payload);

        _logger.LogInformation(
            "Running quality check on radiology request. CorrelationId={CorrelationId}, ReportLength={ReportLength}",
            payload.SessionData.CorrelationId,
            payload.Report?.ReportText.Length);

        if (_azureOpenAi.IsConfigured)
        {
            _logger.LogInformation("Using Azure OpenAI provider.");
            return ProcessWithChatClient(payload, _azureOpenAi.GetChatClient());
        }

        if (_foundryLocalSettings.Enabled)
        {
            _logger.LogInformation(
                "Using Foundry Local provider (model={Model}). If this is the first request after startup, the model may need to download and load — this can take several minutes.",
                _foundryLocalSettings.ModelAlias);
            // GetChatClientAsync is lazily memoized; first call may be slow due to model download/load.
            var chatClient = _foundryLocal.GetChatClientAsync().GetAwaiter().GetResult();
            return ProcessWithChatClient(payload, chatClient);
        }

        throw new InvalidOperationException(
            "No model provider configured. Set Azure OpenAI Endpoint/ApiKey/DeploymentName, or set FoundryLocal.Enabled=true in appsettings.json.");
    }

    private ProcessResponse ProcessWithChatClient(ProcessRequest payload, ChatClient chatClient)
    {
        var prompt = JsonSerializer.Serialize(new
        {
            report = new { reportText = payload.Report?.ReportText },
            patientInformation = new
            {
                dateOfBirth = payload.PatientInformation?.DateOfBirth,
                biologicalSex = payload.PatientInformation?.BiologicalSex.ToString()
            }
        });

        var json = RunChatCompletion(chatClient, prompt);
        return MapToResult(json);
    }

    internal static string RunChatCompletion(ChatClient chatClient, string userMessage)
    {
        List<ChatMessage> messages = new List<ChatMessage>()
        {
            new SystemChatMessage(SystemPrompt),
            new UserChatMessage(userMessage),
        };

        var response = chatClient.CompleteChat(messages, new ChatCompletionOptions());
        return response.Value.Content[0].Text;
    }

    private ProcessResponse MapToResult(string json)
    {
        const string qualityCheckResultPropertyName = "qualityCheckResult";

        _logger.LogDebug("Raw JSON response from the agent: {Json}", json);

        // Strip a surrounding Markdown code fence (e.g. ```json ... ```) that some chat models emit.
        json = json.Trim();
        if (json.StartsWith("```", StringComparison.Ordinal))
        {
            // Drop the opening fence line (handles ``` and ```json).
            var firstNewline = json.IndexOf('\n', StringComparison.Ordinal);
            json = firstNewline >= 0 ? json[(firstNewline + 1)..] : json[3..];
            if (json.EndsWith("```", StringComparison.Ordinal))
            {
                json = json[..^3];
            }

            json = json.Trim();
        }

        var root = JsonDocument.Parse(json);
        var qualityCheckResultElement = root.RootElement.GetProperty(qualityCheckResultPropertyName);
        var qualityCheckResult = qualityCheckResultElement.Deserialize<QualityCheckResult>(DeserializeOptions);

        var response = new ProcessResponse
        {
            Success = true,
            Message = "Payload processed successfully.",
            Payload = new Dictionary<string, QualityCheckResult>(),
        };
        response.Payload[qualityCheckResultPropertyName] = qualityCheckResult ?? new QualityCheckResult();
        return response;
    }
}
