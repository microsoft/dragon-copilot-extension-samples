# Authentication and Authorization Implementation Documentation

## Overview

The Dragon Copilot Sample Extension implements a multi-layered security approach combining **Microsoft Entra ID (Azure AD) JWT authentication** with **custom license key validation**. This design provides both enterprise-grade identity verification and flexible business logic enforcement.

## Architecture

The security system uses a **dual-gate approach**:

1. **First Gate**: JWT Authentication & Authorization (Microsoft EntraId)  
  The protection of the service-to-service requests from the Dragon Copilot Extension Runtime is covered in detail in [AuthenticationDesign.md](AuthenticationDesign.md).

2. **Second Gate**: License Key Validation (Custom Business Logic)

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Request   │--->│ JWT Auth &   │--->│ License Key     │--->│   Protected │
│             │    │ Authorization│    │ Validation      │    │   Endpoint  │
└─────────────┘    └──────────────┘    └─────────────────┘    └─────────────┘
                         ↓                       ↓
                    401 Unauthorized        403 Forbidden
```

## Configuration

### Development Environment

The development configuration disables both authentication layers for ease of testing:

- **Authentication**: Disabled
- **License Key Validation**: Disabled

**Purpose**: Allows easy testing and development without authentication overhead.

### Production Environment

The production configuration enables full security:

- **Authentication**: Enabled with Microsoft Entra ID integration
- **License Key Validation**: Enabled with configurable header name and valid keys

**Required Production Settings**:
- `TenantId`: Your organization's Entra ID tenant identifier
- `ClientId`: The registered application identifier in Entra ID
- `Instance`: The Entra ID authority URL (typically `https://login.microsoftonline.com/`)
- `RequiredClaims`: Array of required claims for authorization (e.g., `["oid", "azp"]`)
- `HeaderName`: Custom header name for license keys (e.g., `"X-License-Key"`)
- `ValidKeys`: Array of valid license key values

## Microsoft Entra ID (JWT) Authentication

### Implementation Features

1. **Microsoft Identity Web Integration**: Uses Microsoft's official library for seamless Entra ID integration
2. **Conditional Enablement**: Can be completely disabled for development environments
3. **Custom Authorization Policies**: Supports additional claim-based requirements beyond basic authentication
4. **Graceful Degradation**: When disabled, authorization policies automatically allow access

### Usage in Controllers

Controllers use the `[Authorize]` attribute with custom policies to enforce JWT authentication and any additional claim requirements.

## License Key Validation

### Purpose

The license key system demonstrates how to implement **custom business authorization** beyond identity verification. This pattern can represent:

- **Subscription tiers** (basic, premium, enterprise)
- **Feature flags** (access to specific functionality)
- **Partner access** (different API rate limits or features)
- **Usage quotas** (track and limit API calls per key)

### Implementation Features

1. **Conditional Processing**: Only runs when enabled in configuration
2. **Configurable Header**: Header name is fully configurable
3. **Structured Error Responses**: Returns consistent JSON error messages
4. **Context Storage**: Makes validated license key available to downstream controllers
5. **Multiple Valid Keys**: Supports different license types and values

### Key Features

- Validates license keys from HTTP headers
- Returns 403 Forbidden for invalid or missing keys
- Stores validated keys in the request context for downstream use
- Supports multiple valid keys for different access levels

## Route Protection Strategy

### Public vs Protected Routes

The system defines specific routes that bypass all security checks:

- **Health endpoints**: `/health` and `/v1/health` for monitoring
- **Swagger UI**: `/index.html` for API documentation (development only)

All other routes require both JWT authentication and license key validation when enabled.

### Conditional Security Application

Security middleware is applied selectively using route filtering:

- **Public routes**: Bypass all security checks
- **Protected routes**: Require JWT authentication first, then license key validation
- **Order matters**: JWT validation occurs before license key validation

## API Response Codes

| Code | Description | Trigger |
|------|-------------|---------|
| **200** | Success | Request processed successfully |
| **400** | Bad Request | Invalid payload or parameters |
| **401** | Unauthorized | JWT authentication failed or missing |
| **403** | Forbidden | JWT required claims missing, License key validation failed |
| **500** | Internal Server Error | Processing exception |

## Swagger Integration

The API documentation automatically includes security schemes for both authentication methods when enabled:

- **Bearer Authentication**: JWT token in Authorization header
- **License Key**: Custom header for license key validation

Security requirements are dynamically added based on configuration, ensuring the documentation accurately reflects the current security setup.

## Usage Examples

### Development (No Authentication)

Simple requests without any authentication headers work in development mode.

### Production (Full Authentication)

Production requests require both JWT tokens and license keys:

- **Authorization header**: Bearer token from Entra ID
- **License key header**: Valid license key value

## Extension Points

This architecture provides several extension opportunities:

1. **Enhanced License Logic**: Replace simple key validation with database lookups, expiration checks, feature flags
2. **Rate Limiting**: Implement different limits per license tier
3. **Audit Logging**: Track API usage per license key
5. **Multi-tenant Support**: Route requests based on license key to different processing logic

## Security Best Practices

1. **Defense in Depth**: Multiple security layers provide redundancy
2. **Graceful Degradation**: System works in development without security overhead
3. **Structured Errors**: Consistent error responses don't leak implementation details
4. **Configuration-Driven**: Security can be toggled without code changes
5. **Standards Compliance**: Uses standard JWT and HTTP authentication patterns

This dual-layer security approach provides both enterprise identity integration and flexible business logic enforcement, making it suitable for various deployment scenarios and business requirements.
