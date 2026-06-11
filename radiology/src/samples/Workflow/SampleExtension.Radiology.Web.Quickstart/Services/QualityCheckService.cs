using Dragon.Copilot.Radiology.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SampleExtension.Radiology.Web.Quickstart.Services;

/// <summary>
/// Quality-check service that returns a stubbed response loaded from
/// <c>MockData/qualitycheck-response.json</c>. Partners can replace the
/// implementation with their own logic.
/// </summary>
public sealed class QualityCheckService : IQualityCheckService
{
    private const string QualityCheckPayloadKey = "qualityCheckResult";
    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PreferredObjectCreationHandling = JsonObjectCreationHandling.Populate,
    };

    private readonly ILogger<QualityCheckService> _logger;
    private readonly Lazy<ProcessResponse> _mockResponse;

    public QualityCheckService(
        IConfiguration configuration,
        IWebHostEnvironment env,
        ILogger<QualityCheckService> logger)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(env);
        ArgumentNullException.ThrowIfNull(logger);

        _logger = logger;

        var relativePath = configuration["SampleExtension:MockDataFile"] ?? "MockData/qualitycheck-response.json";
        var fullPath = Path.Combine(env.ContentRootPath, relativePath);

        _mockResponse = new Lazy<ProcessResponse>(() => LoadMockResponse(fullPath));
    }

    /// <inheritdoc />
    public ProcessResponse Process(ProcessRequest payload)
    {
        ArgumentNullException.ThrowIfNull(payload);

        _logger.LogInformation(
            "Running quality check on radiology request. CorrelationId={CorrelationId}, ReportLength={ReportLength}",
            payload.SessionData.CorrelationId,
            payload.Report?.ReportText.Length);

        _logger.LogInformation("No model provider configured. Returning mock data.");
        return ProcessWithMockData();
    }

    private ProcessResponse ProcessWithMockData()
    {
        var template = _mockResponse.Value;
        var result = new ProcessResponse
        {
            Success = template.Success,
            Message = template.Message,
            Payload = new Dictionary<string, QualityCheckResult>(),
        };

        if (template.Payload is { } templatePayload
            && templatePayload.TryGetValue(QualityCheckPayloadKey, out var templateQc))
        {
            result.Payload[QualityCheckPayloadKey] = new QualityCheckResult
            {
                Recommendations = [.. templateQc.Recommendations],
            };
        }

        return result;
    }

    private ProcessResponse LoadMockResponse(string fullPath)
    {
        if (!File.Exists(fullPath))
        {
            _logger.LogWarning("Mock data file not found at {Path}. Returning an empty successful response.", fullPath);
            return new ProcessResponse { Success = true, Message = "No mock data configured." };
        }

        var json = File.ReadAllText(fullPath);
        var response = JsonSerializer.Deserialize<ProcessResponse>(json, DeserializeOptions);

        if (response is null)
        {
            _logger.LogWarning("Mock data file at {Path} deserialized to null. Returning an empty successful response.", fullPath);
            return new ProcessResponse { Success = true, Message = "Mock data was empty." };
        }

        _logger.LogInformation(
            "Loaded {Count} mock recommendation(s) from {Path}.",
            response.Payload?[QualityCheckPayloadKey].Recommendations.Count ?? 0,
            fullPath);

        return response;
    }
}
