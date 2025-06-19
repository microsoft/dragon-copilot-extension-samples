// // Copyright (c) Microsoft Corporation.
// // Licensed under the MIT License.

using System;
using Microsoft.Extensions.Logging;

namespace SampleExtension.Web.Extensions;

internal static partial class LoggerExtensions
{
    [LoggerMessage(
        Level = LogLevel.Error,
        Message =  "Unexpected error occurred while processing request")]
    public static partial void LogUnexpectedProcessingException(this ILogger logger, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Processing request {RequestId} with data: {Data}")]
    public static partial void LogProcessingStart(this ILogger logger, Guid requestId, string data);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Successfully processed request {RequestId} in {ProcessingTimeMs}ms")]
    public static partial void LogProcessingSuccess(this ILogger logger, Guid requestId, long processingTimeMs);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Error processing request {RequestId}")]
    public static partial void LogProcessingException(this ILogger logger, Exception ex, Guid requestId);
}
