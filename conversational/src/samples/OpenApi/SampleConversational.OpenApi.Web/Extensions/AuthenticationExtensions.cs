// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using SampleConversational.OpenApi.Web.Configuration;

namespace SampleConversational.OpenApi.Web.Extensions;

/// <summary>
/// Authentication / authorization registration.
/// </summary>
internal static class AuthenticationExtensions
{
    /// <summary>
    /// Name of the authorization policy applied to the API endpoints.
    /// </summary>
    internal const string RequiredClaimsPolicy = "RequiredClaims";

    /// <summary>
    /// Adds Microsoft Entra ID JWT validation and the <see cref="RequiredClaimsPolicy"/> policy.
    /// When authentication is disabled the policy allows every request.
    /// </summary>
    internal static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var section = configuration.GetSection(AuthenticationOptions.SectionName);
        var options = section.Get<AuthenticationOptions>();

        if (options?.Enabled != true)
        {
            services.AddAuthentication();
            services.AddAuthorizationBuilder()
                .AddPolicy(RequiredClaimsPolicy, policy => policy.RequireAssertion(_ => true));
            return services;
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
            });

        return services;
    }
}
