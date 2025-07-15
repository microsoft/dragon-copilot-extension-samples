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
    /// <returns>Authorization result with success status and optional failure reason</returns>
    Task<AuthorizationResult> AuthorizeAsync(HttpRequest request);
}
