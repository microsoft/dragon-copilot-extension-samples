---
applyTo: '**/*.cs,**/*.csproj'
---

# C# Sample Conventions — Copilot Instructions

Shared C# conventions used across the C# samples in this repository. This repository contains samples for multiple Dragon Copilot products (Physician, Radiology, and potentially others in the future). Product-specific patterns live in the matching `<product>.instructions.md` overlay (loaded automatically via `applyTo: <product>/**`).

## Stack

- ASP.NET Core (Web SDK, `Microsoft.NET.Sdk.Web`).
- Target framework varies by product and sample: Physician uses `net9.0`; Radiology Quickstart uses `net10.0`; Radiology AI uses `net10.0-windows10.0.26100` (Windows-only due to Foundry Local). Check the product overlay or `.csproj` for the exact TFM.
- `Microsoft.Identity.Web` and `Microsoft.AspNetCore.Authentication.JwtBearer` for Entra ID JWT bearer authentication.
- `System.Text.Json` for serialization, with `JsonStringEnumConverter` registered for enum-as-string serialization and `PropertyNameCaseInsensitive = true`.
- `Swashbuckle.AspNetCore` for OpenAPI / Swagger documentation in Development.

## Endpoint and controller pattern

- Single-purpose controller per extension capability, decorated with `[ApiController]`, `[Route("v1")]`, `[Produces("application/json")]`.
- Apply `[Authorize(Policy = "RequiredClaims")]` to the process endpoint, either at the controller level or on the action method. Do not use anonymous routes for business endpoints.
- POST the process endpoint at `v1/process` and return `Task<ActionResult<ProcessResponse>>`. All samples use an async controller action that accepts a `CancellationToken` parameter to support request cancellation.
- Include explicit `[ProducesResponseType]` attributes covering at minimum `200`, `400`, `500`. Add `401` / `403` when the sample stacks additional auth layers on top of JWT.

## Authentication pattern

- Configure authentication via the `AddCustomAuthentication(IConfiguration)` extension method.
- The "RequiredClaims" authorization policy uses a disabled-mode pass-through (`RequireAssertion(_ => true)`) when `Authentication.Enabled` is `false` so disabled-mode requests pass through cleanly.
- In enabled mode the policy chains `RequireAuthenticatedUser()` plus one `RequireClaim` call per entry under `RequiredClaims` in configuration.
- The JWT bearer `OnAuthenticationFailed` handler parses the incoming bearer header and logs the actual audience versus the expected audience, which makes "wrong audience" failures easy to diagnose.
- An `OnTokenValidated` handler logs the inbound claims that the policy will evaluate.

## Pipeline pattern

- Health-check endpoints return a JSON body (e.g. `{"status":"Healthy"}`); samples either use `MapGet` returning `Results.Ok(...)` or a `HealthCheckOptions.ResponseWriter` that writes JSON. Route names vary by product (Physician uses `/health`; Radiology uses `/health/liveness` and `/health/readiness`).
- Wire up the security pipeline via `app.UseFullSecurity()`.
- `UseFullSecurity` wraps `UseAuthentication` and `UseAuthorization` inside `app.UseWhen(ctx => !isPublicRoute(ctx), ...)` so public routes bypass JWT validation.
- Public routes:
  - `/health/liveness`
  - `/health/readiness`
  - Swagger UI at the application root in Development

## Coding conventions

- Mark concrete classes as `sealed` unless they are intended for inheritance.
- Null-check constructor parameters at the top with `ArgumentNullException.ThrowIfNull(...)`.
- Use the options pattern (`IOptions<T>`) for configuration sections; do not pass `IConfiguration` to deep collaborators.
- Use primary constructors or explicit constructor injection. Use `ILogger<T>` for logging.
- Sample projects suppress documentation analyzers commonly noisy on minimal samples (CA1812, CA1515, CA1848, CA1873, CS1591, CA2227).

## Out of scope

The following patterns appear in some samples but are **not** universal across the repository. Do not assume them when generating new C# code unless the product overlay calls them out:

- Additional business-auth middleware on top of JWT (e.g. license-key validation).
- A dedicated static class for public-route lists (some samples use an inline string array instead).
- Source-generated `[LoggerMessage]` partials.
- A per-sample `extension.yaml` manifest checked into the C# sample folder.

When working inside a specific product folder, also follow that product's overlay (e.g. `physician.instructions.md`, `radiology.instructions.md`).
