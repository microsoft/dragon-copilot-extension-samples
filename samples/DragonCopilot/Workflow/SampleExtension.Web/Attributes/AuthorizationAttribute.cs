// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using SampleExtension.Web.Services;

namespace SampleExtension.Web.Attributes;

/// <summary>
/// Custom authorization attribute for configured authorization service
/// </summary>
public sealed class AuthorizationAttribute : ActionFilterAttribute
{
    /// <inheritdoc />
    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(next);

        var authorizationService = context.HttpContext.RequestServices.GetRequiredService<IAuthorizationService>();

        var authorizationResult = await authorizationService.AuthorizeAsync(context.HttpContext.Request)
            .ConfigureAwait(false);

        if (!authorizationResult.IsAuthorized)
        {
            context.Result = new ObjectResult(new
            {
                success = false,
                error = "Unauthorized",
                message = authorizationResult.FailureReason ?? "Authorization failed"
            })
            {
                StatusCode = StatusCodes.Status401Unauthorized
            };
            return;
        }

        await next().ConfigureAwait(false);
    }
}
