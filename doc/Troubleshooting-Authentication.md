# Troubleshooting Authentication for Dragon Copilot Extensions

**Audience:** Developers building and operating Dragon Copilot extensions.
**Scope:** Service-to-service authentication between the Dragon Copilot Extension Runtime and a partner-hosted extension endpoint — JWT/Microsoft Entra ID, Application ID URI / `identifierUris`, and manifest configuration.

**See also:** [Authentication.md](Authentication.md) · [AuthenticationDesign.md](AuthenticationDesign.md)

---

## How to use this guide

1. Find your symptom in the [Symptom → Likely Cause matrix](#1-symptom--likely-cause-matrix).
2. Jump to the matching deep-dive in [Section 2](#2-deep-dives).
3. Before opening a support ticket, work through the [Pre-flight checklist](#4-pre-flight-checklist) and gather the [diagnostic bundle](#5-diagnostic-bundle).

---

## 1. Symptom → Likely Cause matrix

| Symptom | Most likely cause | Jump to |
|---|---|---|
| `401 Unauthorized` with `invalid_token` / `InvalidAudience` | `aud` claim does not match your extension's Client ID | [2.1](#21-401--invalidaudience) |
| `401 Unauthorized` with `InvalidIssuer` | `iss` claim does not match `https://login.microsoftonline.com/{your-tenant-id}/v2.0` | [2.2](#22-401--invalidissuer) |
| `401 Unauthorized` with `InvalidApplicationId` | `azp` claim is not the Dragon Copilot Runtime's client ID, or `idtyp` ≠ `app` | [2.3](#23-401--invalidapplicationid--idtyp--azp-checks) |
| Extension is deployed but receives no traffic | Manifest endpoint/auth misconfigured, or a WAF / firewall / network ACL is dropping the Runtime's calls | [2.4](#24-no-traffic--silent-failure) |
| `AADSTS500011: resource principal not found in tenant` | Dragon Copilot Runtime service principal is not provisioned in your tenant | [2.5](#25-aadsts500011-resource-principal-not-found) |
| "Which JWT claim identifies the customer?" | Customer/tenant identity model question (multi-tenant routing) | [2.6](#26-which-claim-identifies-the-customer) |
| `InvalidAudience` even though Client ID looks correct | App registration is on **v1 tokens** (set `requestedAccessTokenVersion: 2`) so `aud` carries the App ID URI instead of the Client ID GUID | [2.1](#21-401--invalidaudience) |
| No traffic / token-acquisition failure traced to scope | Application ID URI (`identifierUris`) is malformed or doesn't include the endpoint host | [2.7](#27-application-id-uri--identifieruris-mistakes) |

---

## 2. Deep dives

### 2.1 `401` / `InvalidAudience`

Your extension validated the JWT signature, but the `aud` claim does not match what your validator expects.

**Checks (in order):**
1. Decode the token at <https://jwt.ms> and read the `aud` claim.
2. Confirm your extension's Entra ID app registration has `requestedAccessTokenVersion: 2` in its manifest. Without this, `aud` will contain the Application ID URI instead of the Client ID GUID. See [AuthenticationDesign.md](AuthenticationDesign.md#configure-your-extensions-entra-id-application-registration).
3. Confirm your validator accepts the **Client ID (GUID)** of your extension's app registration as the expected `aud`.
4. Confirm the Application ID URI is `api://{your-tenant-id}/{extension-endpoint-hostname}` and matches the hostname the Runtime is calling. See [§2.7](#27-application-id-uri--identifieruris-mistakes).

**Fix:** Switch the app registration to v2 tokens, or align the validator's expected audience with what is actually issued.

---

### 2.2 `401` / `InvalidIssuer`

The `iss` claim does not match the tenant your extension trusts.

**Checks:**
1. `iss` must be exactly `https://login.microsoftonline.com/{your-tenant-id}/v2.0` (note the `/v2.0` suffix — this is the v2.0 issuer that pairs with `requestedAccessTokenVersion: 2`).
2. Confirm the tenant ID configured in your JWT validator matches the `auth.tenantId` in your `extension.yaml` manifest. The two values **must** match — the `dragon-copilot` CLI prompts for the same value to keep them aligned.
3. Do not use the `common` or `organizations` authority for a single-tenant extension. Pin the validator to your tenant GUID.

---

### 2.3 `401` / `InvalidApplicationId` / `idtyp` / `azp` checks

The token your extension received is not from the Dragon Copilot Extension Runtime.

**Required claims** (see [AuthenticationDesign.md](AuthenticationDesign.md#extension-responsibilities)):

- `idtyp` == `"app"`
- `azp` == `d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8` (Dragon Copilot Extension Runtime Client ID)

**Common mistakes:**
- The `idtyp` optional claim is not configured on the app registration. It must be added explicitly.
- Validating `appid` instead of `azp` — v2 tokens use `azp`.
- Hard-coding a different runtime client ID copied from outdated material. `d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8` is the authoritative value.

---

### 2.4 No traffic / silent failure

Symptom: the extension is deployed and "auth is configured," but no requests ever arrive at the endpoint.

**Checks (in order):**
1. **Manifest auth block.** In `extension.yaml`, verify `auth.tenantId` is the **partner tenant GUID** (the tenant issuing and validating tokens), not the customer's tenant.
2. **Endpoint reachability.** The endpoint in your manifest must be a publicly reachable HTTPS URL with a valid (non-self-signed) TLS certificate. The Runtime will not call HTTP endpoints.
3. **WAF / firewall / network ACLs.** A Web Application Firewall, NSG, private endpoint, IP allowlist, or upstream proxy in front of your extension can silently drop the Runtime's calls — often before they reach your application logs. Check at the edge first:
   - Look at WAF / firewall / load balancer logs for blocked or dropped requests around the time you expect traffic.
   - Confirm the path (`POST` to your `/v1/process` endpoint) and `Authorization` header are not being stripped or normalized by an intermediate proxy.
   - Common managed-WAF rule sets (Azure Front Door / Application Gateway default rules, Cloudflare managed rules) sometimes flag the request body or bearer header as suspicious. Temporarily lower the rule set or whitelist the Runtime's traffic to confirm.
   - If your endpoint is in a VNet behind a private endpoint or IP allowlist, the Runtime's egress is not on a fixed IP range — you cannot allowlist it. Expose the endpoint via a public ingress (Azure API Management, Azure Front Door, Application Gateway, or Container Apps public ingress).
4. **Trigger configuration.** If `trigger: AdaptiveCardAction`, the extension only fires on user action — it will not auto-run.

---

### 2.5 `AADSTS500011`: resource principal not found

The Dragon Copilot Extension Runtime's service principal has not been provisioned into the tenant performing the token acquisition.

**Fix (one-time per tenant):**

- **Preferred:** Register the `Microsoft.HealthPlatform` resource provider in any Azure subscription bound to that tenant. This automatically injects the service principal.
- **Alternative:** A tenant admin runs:
  ```powershell
  New-MgServicePrincipal -AppId d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8
  ```

See [AuthenticationDesign.md §Add the Service Principal to your tenant](AuthenticationDesign.md#add-the-service-principal-to-your-tenant).

---

### 2.6 Which claim identifies the customer?

Common question for partners building multi-tenant extensions: which JWT claim identifies *which customer* the request belongs to?

**Current model:**
- Extension app registrations are **single-tenant** (the partner's tenant). The `iss`, `aud`, and `azp` claims therefore identify the platform calling you — not the end customer.
- **Customer/tenant identity is conveyed in the request payload** (`DragonStandardPayload` — session, encounter, practitioner context), not in the JWT.
- For stable customer routing, key off identifiers in the payload (for example, practitioner tenant identifier, encounter context).

If your scenario truly requires a customer-scoped JWT claim, raise it with your Microsoft contact.

---

### 2.7 Application ID URI / `identifierUris` mistakes

A misconfigured Application ID URI on your Entra ID app registration is a common reason the Runtime cannot deliver requests to your extension. Symptoms range from "no traffic at all" to confusing token-acquisition errors in platform logs.

**Mental model:** the Dragon Copilot Extension Runtime acquires a token using `identifierUri` **as the scope it requests from Microsoft Entra ID**. Entra ID validates the requested scope against the `identifierUris` array on your app registration:

- If the scope matches one of your app registration's `identifierUris`, Entra ID issues a token. With `requestedAccessTokenVersion: 2`, the resulting `aud` claim is your extension's **Client ID (GUID)** — *not* the `identifierUri` itself (see [§2.1](#21-401--invalidaudience)).
- If no `identifierUri` matches the requested scope, **token acquisition fails** and the Runtime never calls your endpoint. The symptom is "no traffic" (see [§2.4](#24-no-traffic--silent-failure)), not `InvalidAudience` on your side.

`identifierUri` is therefore essential to *getting a token in the first place* — even though it does not appear in the `aud` claim of v2 tokens.

**Canonical format:**

```
api://{your-tenant-id}/{exact-endpoint-hostname}
```

**Common mistakes:**

1. **Host in `identifierUri` does not match the endpoint host in `extension.yaml`.**
   - Manifest endpoint: `https://func-xyz.azurewebsites.net/v1/process`
   - `identifierUris`: `api://{tenant}/api.mypartner.com` ← wrong host
   - **Fix:** the hosts must be byte-for-byte identical.

2. **Using the App ID (clientId) instead of the tenant ID in the URI.**
   - Wrong: `api://{clientId-guid}/{host}`
   - Right: `api://{tenantId-guid}/{host}`

3. **Including a path or port in the URI.**
   - Wrong: `api://{tenant}/api.mypartner.com/v1/process`
   - Wrong: `api://{tenant}/api.mypartner.com:8443`
   - Right: `api://{tenant}/api.mypartner.com` — **host only**, no path, port, or query.

4. **Re-using one hostname across environments.**
   - Use distinct hostnames per environment (e.g. `dev.api.mypartner.com`, `staging.api.mypartner.com`, `api.mypartner.com`) so each environment can be granted/revoked independently and tokens can be traced back to the environment they were issued for.

5. **Forgetting that an app registration can hold multiple `identifierUris`.**
   - For non-prod consolidation, add multiple entries to the `identifierUris` array in the app registration manifest:
     ```json
     "identifierUris": [
       "api://{tenant}/dev.api.mypartner.com",
       "api://{tenant}/staging.api.mypartner.com"
     ]
     ```
   - **For production, prefer a separate app registration** as defense-in-depth.

6. **Dev tunnel / temporary hostnames updated in the manifest but not in `identifierUris`.**
   - Common during local development with dev tunnels, ngrok, or VS Code Tunnels.
   - When the tunnel host changes, update **both** the `endpoint` in `extension.yaml` *and* the `identifierUris` array. Otherwise the Runtime can no longer acquire a token for your endpoint and traffic stops.

7. **Wildcard URIs (e.g. `api://{tenant}/*.mypartner.com`).**
   - Not supported. Enumerate each concrete host you need.

**Quick validation procedure:**

```text
1. Read the endpoint host from extension.yaml (tools[].endpoint).
2. Read the identifierUris array from your Entra app registration manifest.
3. Confirm the array contains exactly: api://{your-tenant-id}/{that-host}.
4. Decode a real token at https://jwt.ms and confirm:
     - aud  == your extension's Client ID (GUID)   (v2 tokens; see §2.1)
     - azp  == d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8 (Runtime; see §2.3)
     - iss  == https://login.microsoftonline.com/{your-tenant-id}/v2.0 (see §2.2)
```

If step 3 fails, the Runtime cannot get a token and you will see no traffic. If steps 1–3 pass but step 4 shows unexpected claims, jump to the relevant section above.

---

## 3. FAQ

**Q: Can I disable authentication for local development?**
Yes. The reference sample includes a development configuration that disables the JWT gate for ease of testing. Never ship a configuration that disables auth to production. See [Authentication.md §Development Environment](Authentication.md#development-environment).

**Q: Which Entra ID token version should I use?**
**v2.** Set `requestedAccessTokenVersion: 2` in your app registration manifest. v1 tokens place the Application ID URI in `aud`, which produces confusing `InvalidAudience` errors against validators expecting the Client ID GUID.

**Q: What is the Dragon Copilot Extension Runtime Client ID?**
`d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8`. Validate this as `azp` on incoming tokens.

**Q: Does my extension's app registration need to be multi-tenant?**
No — **single-tenant** is correct and recommended. The platform calls your extension with a token issued by your tenant.

**Q: My endpoint is behind a private network / VNet. Can the Runtime reach it?**
The endpoint URL in the manifest must be publicly reachable HTTPS. Use a public ingress (Azure API Management, Azure Front Door, Application Gateway, or Container Apps with public ingress).

**Q: Are there TLS requirements?**
Yes — HTTPS with TLS 1.2 or higher, server certificate validated by a public CA. Self-signed certificates are rejected.

**Q: How do I see the actual token the Runtime sent me?**
Log the raw `Authorization` header at the first middleware, before validation runs. **Strip the token from logs in production** — treat it as a secret. For debugging, decode at <https://jwt.ms>.

**Q: My `extension.yaml` `auth.tenantId` and the tenant ID in my JWT validator — must they match?**
Yes. The CLI prompts for the same value precisely to keep them aligned. A mismatch is a common source of `InvalidIssuer` errors.

**Q: What exactly goes in the Application ID URI (`identifierUris`)?**
The format is `api://{your-tenant-id}/{endpoint-hostname}` — host only, no path, no port, no wildcards, and use the **tenant ID** (not the client ID). The host must match the hostname of your extension endpoint in `extension.yaml` exactly. See [§2.7](#27-application-id-uri--identifieruris-mistakes).

**Q: How do I handle dev / staging / prod environments?**
Two supported patterns:
- **(a)** One app registration with multiple `identifierUris` (one per environment hostname). Good for non-prod consolidation.
- **(b)** Separate app registrations per environment. Preferred for production isolation so tokens cannot be replayed across environments.

**Q: My dev tunnel hostname keeps changing. What do I update?**
Both the `endpoint` in `extension.yaml` **and** the `identifierUris` array on your Entra ID app registration. This is easy to forget and manifests as `InvalidAudience` on the very next call.

---

## 4. Pre-flight checklist

Work through this list before opening a support ticket.

- [ ] Decoded a real failing token at <https://jwt.ms> and captured `iss`, `aud`, `azp`, `idtyp`, `exp`.
- [ ] Confirmed `iss` == `https://login.microsoftonline.com/{my-tenant-id}/v2.0`.
- [ ] Confirmed `aud` == my extension's Client ID (GUID), and my app registration uses v2 tokens.
- [ ] Confirmed `identifierUris` on the app registration includes `api://{my-tenant-id}/{endpoint-hostname}` matching the host in `extension.yaml`.
- [ ] Confirmed `azp` == `d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8` and `idtyp` == `app`.
- [ ] Confirmed `auth.tenantId` in `extension.yaml` matches the tenant ID configured in my JWT validator.
- [ ] Confirmed the Dragon Copilot Runtime service principal exists in my tenant (no `AADSTS500011`).
- [ ] Confirmed the extension endpoint is public HTTPS with a valid TLS certificate.
- [ ] Checked WAF / firewall / proxy / load balancer logs for dropped or blocked requests from the Runtime (and confirmed the `Authorization` header is not being stripped upstream).

---

## 5. Diagnostic bundle

Attach the following when opening a support ticket to accelerate resolution:

1. **Dragon session correlation ID** — the correlation/session ID shown in the Dragon UI for the session in which the failure occurred. This is the primary identifier the platform team uses to trace the failing request through Runtime logs.
2. **Approximate timestamp** of the failure (date and rough time-of-day in your local time zone is sufficient).
3. **Decoded JWT** (header and payload only — never include the signature) of the failing token.
4. **Exact HTTP status code and response body** your extension returned.
5. **Excerpts from `extension.yaml`** showing the `auth` block and `tools[].endpoint`.
6. **Your extension's auth configuration** — the tenant ID, expected audience, expected issuer, and any required claims your JWT validator enforces.
7. **Your tenant ID** and **extension Client ID (GUID)**.
8. Whether the issue is **100% reproducible or intermittent**, and the approximate failure rate.
