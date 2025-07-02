// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using Microsoft.Extensions.Logging;

namespace DragonBackendSimulator.Web.Extensions;

internal static partial class LoggerExtensions
{
    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "HTTP error occurred while simulating encounter")]
    public static partial void LogHttpException(this ILogger logger, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Timeout occurred while simulating encounter")]
    public static partial void LogHttpTimoutException(this ILogger logger, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Unexpected error occurred while simulating encounter")]
    public static partial void LogHttpUnexpectedException(this ILogger logger, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Simulating encounter {EncounterId} with name '{Name}'")]
    public static partial void LogEncounterStart(this ILogger logger, Guid encounterId, string name);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Calling extension API for encounter {EncounterId} at {ApiUrl}{ApiPath}")]
    public static partial void LogExtensionSuccess(this ILogger logger, Guid encounterId, Uri apiUrl, string apiPath);

    [LoggerMessage(
        Level = LogLevel.Information,
        Message = "Encounter {EncounterId} completed extension call successfully with status {StatusCode}")]
    public static partial void LogExtensionSuccess(this ILogger logger, Guid encounterId, int? statusCode);


    [LoggerMessage(
        Level = LogLevel.Warning,
        Message = "Encounter {EncounterId} failed extension call with status {StatusCode}: {ReasonPhrase}")]
    public static partial void LogExtensionFailure(this ILogger logger, Guid encounterId, int? statusCode, string reasonPhrase);

    [LoggerMessage(
        Level = LogLevel.Warning,
        Message = "Error occurred while processing encounter {EncounterId}")]
    public static partial void LogExtensionException(this ILogger logger, Exception ex, Guid encounterId);
}
