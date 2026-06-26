# Authentication and Authorization Implementation Documentation

## Overview

The Dragon Copilot Sample Extension authenticates incoming service-to-service requests using **Microsoft Entra ID (Azure AD) JWT bearer tokens**. The Dragon Copilot Extension Runtime acquires a token for the extension's app registration and includes it as a standard `Authorization: Bearer <token>` header on every request.

> **Hitting auth errors?** See [Troubleshooting-Authentication.md](Troubleshooting-Authentication.md) for a symptom → cause matrix, FAQ, and pre-flight checklist covering the most common partner issues (`InvalidAudience`/`InvalidIssuer`, `identifierUris` mistakes, `AADSTS500011`, and more).

## Architecture

```
┌─────────────┐    ┌──────────────────────┐    ┌─────────────┐
│   Request   │--->│ JWT Authentication & │--->│  Protected  │
│             │    │     Authorization    │    │   Endpoint  │
└─────────────┘    └──────────────────────┘    └─────────────┘
                             ↓
                       401 Unauthorized
                       403 Forbidden (required claims missing)
```

The full design — token validation rules, required claims, and threat model — is documented in [AuthenticationDesign.md](AuthenticationDesign.md).

## Configuration

> **Note:** The configuration examples below reference the [Physician sample extension](../physician/). Each product's sample follows the same authentication pattern.

### Development Environment

The development configuration in [appsettings.Development.json](../physician/src/samples/DragonCopilot/Workflow/SampleExtension.Web/appsettings.Development.json) disables authentication for ease of testing:

- **Authentication**: Disabled

**Purpose:** allow easy local testing and development without authentication overhead. Never ship a configuration that disables authentication to production.

### Production Environment

The production configuration in [appsettings.json](../physician/src/samples/DragonCopilot/Workflow/SampleExtension.Web/appsettings.json) enables JWT authentication:

- **Authentication**: Enabled with Microsoft Entra ID integration

**Required production settings:**

- `TenantId` — your organization's Entra ID tenant identifier
- `ClientId` — the registered application identifier in Entra ID
- `Instance` — the Entra ID authority URL (typically `https://login.microsoftonline.com/`)
- `RequiredClaims` — claims required for authorization (e.g. `idtyp`, `azp`)

> **CLI Note:** When you generate Clinical App Connector or Physician Workflow manifests with the `dragon-copilot` CLI, the `auth.tenantId` field captured in `extension.yaml` must match the `TenantId` configured here. The CLI wizard prompts for the same tenant information to keep runtime and manifest settings aligned.

## Microsoft Entra ID (JWT) Authentication

### Implementation features

1. **Microsoft Identity Web integration** — uses Microsoft's official library for Entra ID integration.
2. **Conditional enablement** — can be completely disabled for development environments.
3. **Custom authorization policies** — supports additional claim-based requirements beyond basic authentication.
4. **Graceful degradation** — when disabled, authorization policies automatically allow access.

### Usage in controllers

Controllers use the `[Authorize]` attribute with custom policies to enforce JWT authentication and any additional claim requirements.

## Route Protection Strategy

### Public vs protected routes

The sample defines specific routes that bypass authentication:

- **Health endpoints**: `/health` and `/v1/health` for monitoring
- **Swagger UI**: `/index.html` for API documentation (development only)

All other routes require JWT authentication when enabled.

### Conditional security application

Authentication middleware is applied selectively using route filtering:

- **Public routes** — bypass authentication.
- **Protected routes** — require JWT authentication and claim-based authorization.

## API Response Codes

| Code | Description | Trigger |
|------|-------------|---------|
| **200** | Success | Request processed successfully |
| **400** | Bad Request | Invalid payload or parameters |
| **401** | Unauthorized | JWT authentication failed or missing |
| **403** | Forbidden | Required claims missing |
| **500** | Internal Server Error | Processing exception |

## Swagger Integration

The API documentation automatically includes the Bearer security scheme when authentication is enabled:

- **Bearer Authentication** — JWT token in the `Authorization` header.

The security requirement is added dynamically based on configuration, so the documentation reflects the current setup.

## Usage Examples

### Development (no authentication)

Requests without an `Authorization` header work in development mode.

### Production (JWT authentication)

Production requests must include a valid bearer token in the `Authorization` header. The token is acquired by the Dragon Copilot Extension Runtime against your extension's Entra ID app registration.

## Security Best Practices

1. **Standards compliance** — uses standard JWT and HTTP authentication patterns.
2. **Graceful degradation** — system works in development without authentication overhead.
3. **Structured errors** — consistent error responses do not leak implementation details.
4. **Configuration-driven** — authentication can be toggled without code changes.
