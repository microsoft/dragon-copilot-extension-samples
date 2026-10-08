// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi;
using SampleConversational.OpenApi.Web.Extensions;
using SampleConversational.OpenApi.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCustomAuthentication(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Contoso Drug Interaction API",
        Version = "1.0.0",
        Description = "Sample OpenAPI conversational extension for Dragon Copilot. Synthetic data; not for clinical use.",
    });
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// The manifest's specUrl points at this document. Dragon Copilot reads the server URL and
// operationIds from it, so publish the externally reachable host in `servers`.
var publicUrl = app.Configuration["PublicUrl"];
app.UseSwagger(options =>
{
    options.RouteTemplate = "openapi/{documentName}.json";
    options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_0;
    options.PreSerializeFilters.Add((document, request) =>
    {
        var url = string.IsNullOrWhiteSpace(publicUrl) ? $"{request.Scheme}://{request.Host}" : publicUrl;
        document.Servers = [new OpenApiServer { Url = url }];
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "v1"));
}

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .AllowAnonymous()
    .ExcludeFromDescription();

// operationId "checkDrugInteraction" is what the manifest lists in `expose`,
// `customExtractors` and `runtimeParamBindings`.
app.MapPost("/interactions/check", (
        [FromBody] DrugInteractionRequest request,
        [FromHeader(Name = "x-correlation-id")] string? correlationId) =>
    {
        if (string.IsNullOrWhiteSpace(request.MedicationA) || string.IsNullOrWhiteSpace(request.MedicationB))
        {
            return Results.Problem("Both medicationA and medicationB are required.", statusCode: StatusCodes.Status400BadRequest);
        }

        return Results.Ok(DrugInteractions.Check(request, correlationId));
    })
    .WithName("checkDrugInteraction")
    .WithSummary("Check interactions between two medications.")
    .WithDescription("Returns the interaction severity, a summary, and supporting sources for a medication pair.")
    .Produces<DrugInteractionResponse>()
    .ProducesProblem(StatusCodes.Status400BadRequest)
    .RequireAuthorization(AuthenticationExtensions.RequiredClaimsPolicy);

await app.RunAsync().ConfigureAwait(false);

/// <summary>
/// Entry point (exposed for integration tests).
/// </summary>
public partial class Program;
