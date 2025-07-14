// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace SampleExtension.Web.Services;

/// <summary>
/// Service for handling custom authorization logic
/// </summary>
public interface IAuthorizationService
{
    /// <summary>
    /// Checks if the request is authorized based on license key
    /// </summary>
    /// <param name="request">The HTTP request</param>
    /// <returns>True if authorized, false otherwise</returns>
    Task<bool> IsAuthorizedAsync(HttpRequest request);

    /// <summary>
    /// Gets the authorization failure reason
    /// </summary>
    /// <param name="request">The HTTP request</param>
    /// <returns>The failure reason or null if authorized</returns>
    Task<string?> GetAuthorizationFailureReasonAsync(HttpRequest request);
}
