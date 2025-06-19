using SampleExtension.Web.Models;
using System.Diagnostics;

namespace SampleExtension.Web.Services;

/// <summary>
/// Implementation of the processing service
/// </summary>
public class ProcessingService : IProcessingService
{
    private readonly ILogger<ProcessingService> _logger;

    public ProcessingService(ILogger<ProcessingService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ProcessResponse> ProcessAsync(ProcessRequest request, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Processing request {RequestId} with data: {Data}", 
                request.RequestId, request.Data);

            // Simulate some processing time
            await Task.Delay(Random.Shared.Next(100, 500), cancellationToken);

            // Simple processing logic - you can customize this based on your needs
            var processedData = ProcessData(request.Data);

            stopwatch.Stop();

            var response = new ProcessResponse
            {
                RequestId = request.RequestId,
                Success = true,
                Result = processedData,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                Metadata = new Dictionary<string, object>
                {
                    ["originalDataLength"] = request.Data.Length,
                    ["processedDataLength"] = processedData.Length,
                    ["encounterId"] = request.EncounterId?.ToString() ?? "N/A"
                }
            };

            _logger.LogInformation("Successfully processed request {RequestId} in {ProcessingTime}ms", 
                request.RequestId, stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            _logger.LogError(ex, "Error processing request {RequestId}", request.RequestId);

            return new ProcessResponse
            {
                RequestId = request.RequestId,
                Success = false,
                ErrorMessage = ex.Message,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private string ProcessData(string data)
    {
        // Example processing logic - transform the data in some way
        // This is where you would implement your actual business logic
        
        if (string.IsNullOrWhiteSpace(data))
        {
            return "No data provided";
        }

        // Simple example: reverse the string and add processing timestamp
        var reversed = new string(data.Reverse().ToArray());
        var processed = $"Processed: {reversed} | Timestamp: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";
        
        return processed;
    }
}
