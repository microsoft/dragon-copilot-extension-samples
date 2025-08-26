// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

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
    public static partial void LogProcessingStart(this ILogger logger, string? requestId, string? correlationId);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Successfully processed request {RequestId} in {ProcessingTimeMs}ms")]
    public static partial void LogProcessingSuccess(this ILogger logger, Guid requestId, long processingTimeMs);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Error processing Dragon Standard payload. RequestId: {RequestId}")]
    public static partial void LogProcessingException(this ILogger logger, Exception ex, string? requestId);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "JWT Audience validation failed. Token audience: '{ActualAudience}', Expected audience: '{ExpectedAudience}'. Exception: {Exception}")]
    public static partial void LogJwtAudienceValidationFailed(this ILogger logger, string actualAudience, string expectedAudience, string exception, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Failed to parse JWT token for audience debugging. Invalid token format: {Exception}")]
    public static partial void LogJwtTokenParsingFailed(this ILogger logger, string exception, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "JWT Authentication failed: {Exception}")]
    public static partial void LogJwtAuthenticationFailed(this ILogger logger, string exception, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "JWT Token validated successfully")]
    public static partial void LogJwtTokenValidatedSuccessfully(this ILogger logger);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Token audiences: {Audiences}")]
    public static partial void LogTokenAudiences(this ILogger logger, string audiences);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Claim '{ClaimType}' - Expected: [{Expected}], Actual: [{Actual}]")]
    public static partial void LogClaimValidation(this ILogger logger, string claimType, string expected, string actual);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "No required claims configured for validation")]
    public static partial void LogNoRequiredClaimsConfigured(this ILogger logger);
}
