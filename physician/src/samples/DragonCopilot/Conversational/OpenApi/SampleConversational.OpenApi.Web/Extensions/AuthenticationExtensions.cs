// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// Intentionally duplicated in the MCP and OpenAPI samples so each sample can be copied on its own; apply changes to both.

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using SampleConversational.OpenApi.Web.Configuration;

namespace SampleConversational.OpenApi.Web.Extensions;

/// <summary>
/// Authentication / authorization registration.
/// </summary>
/// <remarks>
/// Fails closed: JWT validation is on unless <c>Authentication:Enabled</c> is explicitly <see langword="false"/>
/// AND the app runs in the Development environment. Outside Development the flag is ignored.
/// </remarks>
internal static partial class AuthenticationExtensions
{
    /// <summary>
    /// Name of the authorization policy applied to the API endpoints.
    /// </summary>
    internal const string RequiredClaimsPolicy = "RequiredClaims";

    /// <summary>
    /// Adds Microsoft Entra ID JWT validation and the <see cref="RequiredClaimsPolicy"/> policy.
    /// When authentication is disabled (Development only) the policy allows every request.
    /// </summary>
    internal static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        var section = configuration.GetSection(AuthenticationOptions.SectionName);
        var options = section.Get<AuthenticationOptions>() ?? new AuthenticationOptions();

        if (!IsEnabled(options, environment))
        {
            services.AddAuthentication();
            services.AddAuthorizationBuilder()
                .AddPolicy(RequiredClaimsPolicy, policy => policy.RequireAssertion(_ => true));
            return services;
        }

        var allowedCallers = options.AllowedCallerAppIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (allowedCallers.Count == 0)
        {
            throw new InvalidOperationException(
                $"{AuthenticationOptions.SectionName}:{nameof(AuthenticationOptions.AllowedCallerAppIds)} must list the application (client) ID(s) " +
                "allowed to call this extension. See doc/Authentication.md.");
        }

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(section);

        services.AddAuthorizationBuilder()
            .AddPolicy(RequiredClaimsPolicy, policy =>
            {
                policy.RequireAuthenticatedUser();
                foreach (var claim in options.RequiredClaims)
                {
                    policy.RequireClaim(claim.Key, claim.Value);
                }

                policy.RequireAssertion(context => IsAllowedCaller(context.User, allowedCallers));
            });

        return services;
    }

    /// <summary>
    /// Logs a warning when authentication is off, or when <c>Authentication:Enabled=false</c> is ignored.
    /// </summary>
    internal static void LogAuthenticationState(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var options = app.Configuration.GetSection(AuthenticationOptions.SectionName).Get<AuthenticationOptions>() ?? new AuthenticationOptions();
        if (!IsEnabled(options, app.Environment))
        {
            LogAuthenticationDisabled(app.Logger);
        }
        else if (!options.Enabled)
        {
            LogDisableIgnored(app.Logger, app.Environment.EnvironmentName);
        }
    }

    /// <summary>
    /// Authentication is off only when explicitly disabled in the Development environment.
    /// </summary>
    internal static bool IsEnabled(AuthenticationOptions options, IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(environment);
        return options.Enabled || !environment.IsDevelopment();
    }

    /// <summary>
    /// True when the token's calling application (<c>azp</c> for v2.0 tokens, <c>appid</c> for v1.0 tokens) is allowed.
    /// </summary>
    internal static bool IsAllowedCaller(ClaimsPrincipal user, IReadOnlySet<string> allowedCallerAppIds)
    {
        ArgumentNullException.ThrowIfNull(user);
        ArgumentNullException.ThrowIfNull(allowedCallerAppIds);

        var caller = user.FindFirst("azp")?.Value ?? user.FindFirst("appid")?.Value;
        return caller is not null && allowedCallerAppIds.Contains(caller);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "AUTHENTICATION IS DISABLED (Authentication:Enabled=false in Development). Every request is accepted without a token. Never run like this outside local development.")]
    private static partial void LogAuthenticationDisabled(ILogger logger);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Authentication:Enabled=false is ignored in the '{Environment}' environment; authentication stays enabled. It can be disabled only in Development.")]
    private static partial void LogDisableIgnored(ILogger logger, string environment);
}