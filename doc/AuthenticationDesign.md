# Authentication and Authorization Design Documentation

## Overview

The Dragon Copilot Extension Runtime supports a multi-layered security approach combining **Microsoft Entra ID (Azure AD) authentication** for service-to-service request security with **custom license key validation** for customer authorization. This design provides both enterprise-grade identity verification and flexible business logic enforcement.

This document describes the threat model applied to the service-to-service requests send from the Dragon Copilot Extension Runtime to the Extension and describes the detailed EntraId configuration and token validation required to protect against the identified threats.

See [Authentication.md](Authentication.md) for implementation details in the Sample Extension.

## Service-to-Service Authentication Overview

The Dragon Copilot Extension Runtime receives Extension configuration including the Extension's endpoint and authentication information.
Using this configuration, it sends requests potentially containing sensitive data (such as PHI) to the Extension's endpoint, accompanied by an OAuth 2 access token.

```
┌───────────────────────────┐    ┌───────────────────┐    ┌──────────────┐    ┌───────────────────────┐    ┌────────────────┐
│ Extension Configuration:  │--->│ Dragon Copilot    │--->│ Request w/   │--->│ Extension Endpoint w/ │--->│ Extension      │
│ Extension URL + Auth Info │    │ Extension Runtime │    │ OAuth 2 JWT  │    │ JWT Claims validation │    │ Business Logic │
└───────────────────────────┘    └───────────────────┘    └──────────────┘    └───────────────────────┘    └────────────────┘
                              ^                                            ^
                              |                                            |
                        Trust Boundary                               Trust Boundary
```

This communication path needs to be protected from the threats listed in the next section.

## Threat Analysis

Note that this only covers the service-to-service communication from the Dragon Copilot Extension Runtime to the Extension's endpoint.

See Section [EntraId Configuration](#entraid-configuration) for details on the values to be configured to mitigate the listed threats.

### Dragon Copilot Extension Runtime Responsibilities

- _Goal:_ Each request is sent to the configured Extension endpoint and its confidentiality and integrity are ensured.
  _Realization:_ HTTPS using TLS 1.2+ with server certificates validated by the sender.
- _Goal:_ The Extension for which the token is created is controlled by the owner of the configured Extension endpoint.
  _Realization:_ Verify that the Extension hostname is included in the Extension's Application ID URI.

### Extension Responsibilities

- _Goal:_ Only accept tokens signed by the EntraId tenant controlled by the Extension vendor.
  _Realization:_ Validate the `iss` claim in the JWT.
  The `iss` claim must be of the form `https://login.microsoftonline.com/{Extension vendor's tenant id}/`
- _Goal:_ Only requests from the Dragon Copilot Extension Runtime (and possibly other trusted senders) are accepted.
  _Realization:_ Validate the `idtyp` and `azp` claims in the JWT.
  The `idtyp` claim must contain the string "app" and the `azp` claim must contain the Dragon Copilot Extension Runtime's Application Id (a.k.a. "Client Id"): d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8.
- _Goal:_ Only requests that were created for the Extension are accepted.
  _Realization:_ Validate the `aud` claim in the JWT.
  The `aud` claim must contain the Extension vendor's Application Id (a.k.a. "Client Id").

## EntraId Configuration

### Dragon Copilot Extension Runtime

The Dragon Copilot Extension Runtime is represented in EntraId by an application registration with Application Id (a.k.a. "Client Id") d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8.

### Extension Vendor

- Register an EntraId tenant that will represent the Extension vendor.
  (This may already exist in the Extension vendor is a Microsoft customer.)
- Register the "Microsoft.HealthPlatform" resource provider in an Azure subscription that belongs to this tenant. This will inject a Service Principal (a.k.a. "Enterprise Application") for the Dragon Copilot Extension Runtime application registration into the Extension vendor's tenant.
  Alternatively, the Service Principal can be created by a tenant administrator using the `New-MgServicePrincipal -AppId d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8` PowerShell command.
- Create a single-tenant application registration.
  Configure that application registration as follows:
  - Configure the Application ID URI with a format of `["api://{Extension vendor's tenant id}/{extension endpoint hostname}"]`.
    ![Application ID URI screenshot in EntraId Portal](EntraId-ApplicationIdUri.png)
    Note that multiple values can be configured (e.g. for different deployments) by editing the `identifierUris` array in the application registration's manifest.
  - Ensure that EntraId v2.0 access tokens will be generated by setting "requestedAccessTokenVersion: 2" in the manifest. (This will ensure that the `aud` claim contains the 3P client id.)
    ![App Manifest in EntraId Portal](EntraId-RequestedAccessTokenVersion.png)
  - Ensure that the optional `idtyp` claim is added to the token.
    ![Optional idtyp claim in EntraId Portal](EntraId-Optional-Claim.png)

## Related Documentation

- [EntraID Access Token Claims Reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [EntraID Optional Claims Reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference)
- [Secure applications and APIs by validating claims](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)

