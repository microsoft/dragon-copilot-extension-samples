# Authentication and Authorization Setup

This document describes how to configure and use the authentication and authorization features in the Sample Extension API.

## Overview

The Sample Extension API supports two types of security:

1. **JWT Authentication** using Microsoft Entra ID (Azure AD)
2. **License Key Authorization** using a custom header

Both features can be enabled or disabled independently for different environments.

## Configuration

### Authentication (JWT/Entra ID)

To enable JWT authentication using Microsoft Entra ID, configure the following in your `appsettings.json`:

```json
{
  "Authentication": {
    "Enabled": true,
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id-here",
    "ClientId": "your-client-id-here",
    "Audience": "your-audience-here"
  }
}
```

**Configuration Properties:**
- `Enabled`: Set to `true` to enable JWT authentication
- `Instance`: Azure AD instance URL (typically `https://login.microsoftonline.com/`)
- `TenantId`: Your Azure AD tenant ID
- `ClientId`: Your application's client ID in Azure AD
- `Audience`: Expected audience for JWT tokens (typically your API's app ID URI)

### Authorization (License Key)

To enable license key authorization, configure the following in your `appsettings.json`:

```json
{
  "Authorization": {
    "LicenseKeyEnabled": true,
    "ValidLicenseKey": "your-secret-key",
    "LicenseKeyHeader": "license-key"
  }
}
```

**Configuration Properties:**
- `LicenseKeyEnabled`: Set to `true` to enable license key authorization
- `ValidLicenseKey`: The valid license key value (change from "valid" in production)
- `LicenseKeyHeader`: The HTTP header name for the license key

## Environment-Specific Configuration

### Development Environment

For local development, authentication and authorization are disabled by default in `appsettings.Development.json`:

```json
{
  "Authentication": {
    "Enabled": false
  },
  "Authorization": {
    "LicenseKeyEnabled": false
  }
}
```

### Production Environment

For production, ensure both features are properly configured in your production configuration or environment variables.

## Usage

### Making Authenticated Requests

When authentication is enabled, include a valid JWT token in the Authorization header:

```http
POST /v1/process
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "note": { ... },
  "transcript": { ... }
}
```

### Making Authorized Requests

When license key authorization is enabled, include the license key in the specified header:

```http
POST /v1/process
license-key: your-secret-key
Content-Type: application/json

{
  "note": { ... },
  "transcript": { ... }
}
```

### Using Both Authentication and Authorization

When both are enabled, include both headers:

```http
POST /v1/process
Authorization: Bearer <your-jwt-token>
license-key: your-secret-key
Content-Type: application/json

{
  "note": { ... },
  "transcript": { ... }
}
```

## Swagger Documentation

The Swagger UI automatically includes authentication and authorization documentation when the features are enabled. You can:

1. Navigate to the root URL of your API (e.g., `https://localhost:5001`)
2. Use the "Authorize" button to configure authentication
3. Test API endpoints with proper authentication/authorization

## Azure AD Setup

To set up Azure AD authentication:

1. Register your application in Azure AD
2. Configure API permissions
3. Set up app roles or scopes as needed
4. Update the configuration with your tenant ID, client ID, and audience

## Security Considerations

1. **Never commit secrets**: Use Azure Key Vault, environment variables, or user secrets for sensitive configuration
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Validation**: JWT tokens are automatically validated by Microsoft.Identity.Web
4. **License Key Security**: Use a strong, randomly generated license key in production
5. **Logging**: Authentication failures are logged for monitoring and debugging

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that tokens are valid and not expired
2. **Missing Headers**: Ensure required headers are included in requests
3. **Configuration**: Verify that configuration values are correct
4. **Token Audience**: Ensure the JWT audience matches your configuration

### Debugging

Enable detailed logging in development:

```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.AspNetCore.Authentication": "Debug",
      "Microsoft.AspNetCore.Authorization": "Debug",
      "SampleExtension.Web": "Debug"
    }
  }
}
```

## Testing

### Unit Testing

The authorization service is designed to be easily testable:

```csharp
// Example test setup
var options = Microsoft.Extensions.Options.Options.Create(new AuthorizationOptions
{
    LicenseKeyEnabled = true,
    ValidLicenseKey = "test-key",
    LicenseKeyHeader = "test-header"
});

var logger = Mock.Of<ILogger<AuthorizationService>>();
var service = new AuthorizationService(options, logger);
```

### Integration Testing

For integration tests, you can:
1. Disable authentication/authorization in test configuration
2. Mock JWT tokens for authentication tests
3. Use test license keys for authorization tests
