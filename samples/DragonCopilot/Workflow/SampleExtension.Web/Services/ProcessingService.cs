// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using SampleExtension.Web.Models;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SampleExtension.Web.Extensions;

namespace SampleExtension.Web.Services;

/// <summary>
/// Implementation of the processing service
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
    public async Task<ProcessResponse> ProcessAsync(ProcessRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request, nameof(request));

        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogProcessingStart(request.RequestId, request.Data);

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

            _logger.LogProcessingSuccess(request.RequestId, stopwatch.ElapsedMilliseconds);

            return response;
        }
#pragma warning disable CA1031
        catch (Exception ex)
#pragma warning restore CA1031
        {
            stopwatch.Stop();

            _logger.LogProcessingException(ex, request.RequestId);

            return new ProcessResponse
            {
                RequestId = request.RequestId,
                Success = false,
                ErrorMessage = ex.Message,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private static string ProcessData(string data)
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
