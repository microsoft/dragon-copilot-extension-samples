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
        Message = "Processing Dragon Standard payload. RequestId: {RequestId}, CorrelationId: {CorrelationId}")]
    public static partial void LogProcessingStart(this ILogger logger, string requestId, string correlationId);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Successfully processed request {RequestId} in {ProcessingTimeMs}ms")]
    public static partial void LogProcessingSuccess(this ILogger logger, Guid requestId, long processingTimeMs);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Error processing Dragon Standard payload. RequestId: {RequestId}")]
    public static partial void LogProcessingException(this ILogger logger, Exception ex, string requestId);
}
