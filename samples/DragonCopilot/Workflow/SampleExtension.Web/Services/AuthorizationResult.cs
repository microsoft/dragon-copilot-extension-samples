// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleExtension.Web.Services;

/// <summary>
/// Result of an authorization check
/// </summary>
public class AuthorizationResult
{
    /// <summary>
    /// Gets or sets whether the request is authorized
    /// </summary>
    public bool IsAuthorized { get; set; }

    /// <summary>
    /// Gets or sets the failure reason if not authorized
    /// </summary>
    public string? FailureReason { get; set; }

    /// <summary>
    /// Creates a successful authorization result
    /// </summary>
    /// <returns>An authorized result</returns>
    public static AuthorizationResult Success() => new() { IsAuthorized = true };

    /// <summary>
    /// Creates a failed authorization result with a reason
    /// </summary>
    /// <param name="reason">The failure reason</param>
    /// <returns>An unauthorized result with the failure reason</returns>
    public static AuthorizationResult Failure(string reason) => new() { IsAuthorized = false, FailureReason = reason };
}
