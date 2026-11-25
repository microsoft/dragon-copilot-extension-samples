// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Net;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Hosting;
using SampleConversational.OpenApi.Web.Configuration;
using SampleConversational.OpenApi.Web.Extensions;

namespace SampleConversational.OpenApi.Web.Tests;

public class AuthenticationTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private const string CallerAppId = "11111111-1111-1111-1111-111111111111";

    [Fact]
    public async Task Production_NoToken_ReturnsUnauthorized()
    {
        using var client = CreateClient("Production", enabled: null, allowedCaller: CallerAppId);
        using var response = await SendProtectedRequestAsync(client);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Production_EnabledFalse_IsIgnored()
    {
        using var client = CreateClient("Production", enabled: "false", allowedCaller: CallerAppId);
        using var response = await SendProtectedRequestAsync(client);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public void Production_NoAllowedCallers_FailsAtStartup()
    {
        var exception = Assert.ThrowsAny<Exception>(() =>
        {
            using var client = CreateClient("Production", enabled: "true", allowedCaller: null, clearAllowedCallers: true);
        });
        Assert.Contains("AllowedCallerAppIds", exception.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Health_IsAnonymousInProduction()
    {
        using var client = CreateClient("Production", enabled: null, allowedCaller: CallerAppId);
        using var response = await client.GetAsync(new Uri("/health", UriKind.Relative));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("Development", true, true)]
    [InlineData("Development", false, false)]
    [InlineData("Production", false, true)]
    [InlineData("Staging", false, true)]
    public void IsEnabled_DisablesOnlyInDevelopment(string environmentName, bool enabled, bool expected)
    {
        var options = new AuthenticationOptions { Enabled = enabled };
        Assert.Equal(expected, AuthenticationExtensions.IsEnabled(options, new TestEnvironment(environmentName)));
    }

    [Theory]
    [InlineData("azp", CallerAppId, true)]
    [InlineData("appid", CallerAppId, true)]
    [InlineData("azp", "22222222-2222-2222-2222-222222222222", false)]
    [InlineData("oid", CallerAppId, false)]
    public void IsAllowedCaller_ChecksAzpOrAppId(string claimType, string value, bool expected)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(claimType, value)], "test"));
        var allowed = new HashSet<string>([CallerAppId], StringComparer.OrdinalIgnoreCase);
        Assert.Equal(expected, AuthenticationExtensions.IsAllowedCaller(user, allowed));
    }

    private HttpClient CreateClient(string environment, string? enabled, string? allowedCaller, bool clearAllowedCallers = false) =>
        factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("Authentication:TenantId", "00000000-0000-0000-0000-000000000001");
            builder.UseSetting("Authentication:ClientId", "00000000-0000-0000-0000-000000000002");
            if (enabled is not null)
            {
                builder.UseSetting("Authentication:Enabled", enabled);
            }

            if (clearAllowedCallers)
            {
                builder.UseSetting("Authentication:AllowedCallerAppIds:0", string.Empty);
            }
            else if (allowedCaller is not null)
            {
                builder.UseSetting("Authentication:AllowedCallerAppIds:0", allowedCaller);
            }
        }).CreateClient();

    private static async Task<HttpResponseMessage> SendProtectedRequestAsync(HttpClient client)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/interactions/check", UriKind.Relative))
        {
            Content = new StringContent("""{ "medicationA": "warfarin", "medicationB": "aspirin" }""", Encoding.UTF8, "application/json"),
        };
        return await client.SendAsync(request);
    }

    private sealed class TestEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "test";

        public string ContentRootPath { get; set; } = string.Empty;

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}