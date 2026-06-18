"""Microsoft Entra ID JWT bearer validation.

Mirrors the C# Quickstart's JWT authentication. Validation checks:

* Signature against the Entra ID JWKS for the configured tenant.
* Issuer matches ``https://login.microsoftonline.com/<tenant>/v2.0`` (or the
  v1.0 ``https://sts.windows.net/<tenant>/`` equivalent).
* Audience matches the configured client ID.
* At least one of the ``azp`` / ``appid`` claims is in the allowed-caller list.

Authentication is toggled by ``Authentication.Enabled`` (off by default). When
off, the FastAPI dependency is a no-op and every route is anonymous.

A well-known, idiomatic library (`PyJWT`, with the ``crypto`` extra) performs
signature validation. The signing-key resolver is injectable so tests can
supply a local key and run hermetically without contacting Entra ID.
"""

from __future__ import annotations

from typing import Protocol

import jwt
from fastapi import Depends, Header, HTTPException, status

from .config import AuthenticationSettings, Settings, get_settings


class SigningKeyResolver(Protocol):
    """Resolves the public signing key for a given bearer token."""

    def get_signing_key(self, token: str) -> object:  # pragma: no cover - protocol
        ...


class JwksSigningKeyResolver:
    """Resolves signing keys from the tenant's Entra ID JWKS endpoint."""

    def __init__(self, jwks_uri: str) -> None:
        # PyJWKClient caches keys and refreshes on cache miss.
        self._client = jwt.PyJWKClient(jwks_uri)

    def get_signing_key(self, token: str) -> object:
        return self._client.get_signing_key_from_jwt(token).key


# Module-level resolver cache keyed by JWKS URI so we reuse one PyJWKClient.
_resolvers: dict[str, SigningKeyResolver] = {}


def _default_resolver(auth: AuthenticationSettings) -> SigningKeyResolver:
    resolver = _resolvers.get(auth.jwks_uri)
    if resolver is None:
        resolver = JwksSigningKeyResolver(auth.jwks_uri)
        _resolvers[auth.jwks_uri] = resolver
    return resolver


# Overridable hook so tests can inject a hermetic signing-key resolver.
_resolver_factory = _default_resolver


def set_signing_key_resolver_factory(factory) -> None:
    """Override the signing-key resolver factory (used by tests)."""

    global _resolver_factory
    _resolver_factory = factory


def reset_signing_key_resolver_factory() -> None:
    """Restore the default JWKS-backed resolver factory."""

    global _resolver_factory
    _resolver_factory = _default_resolver


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def validate_token(token: str, auth: AuthenticationSettings) -> dict:
    """Validate a bearer token, returning its claims or raising 401."""

    resolver = _resolver_factory(auth)
    try:
        signing_key = resolver.get_signing_key(token)
    except Exception as exc:  # noqa: BLE001 - any key-resolution failure is a 401
        raise _unauthorized("Unable to resolve token signing key.") from exc

    try:
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=auth.client_id,
            issuer=auth.valid_issuers,
            options={"require": ["exp", "iss", "aud"]},
        )
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid token.") from exc

    # idtyp (when present) must indicate an application token.
    idtyp = claims.get("idtyp")
    if idtyp is not None and idtyp not in auth.required_claims.idtyp:
        raise _unauthorized("Token identity type is not permitted.")

    # At least one of azp / appid must be an allowed caller.
    caller = claims.get("azp") or claims.get("appid")
    if caller not in auth.required_claims.azp:
        raise _unauthorized("Caller is not in the allowed-caller list.")

    return claims


async def require_auth(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict | None:
    """FastAPI dependency enforcing Entra ID auth when enabled.

    Returns ``None`` when authentication is disabled (anonymous access). When
    enabled, returns the validated token claims or raises ``401``.
    """

    auth = settings.authentication
    if not auth.enabled:
        return None

    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("Missing bearer token.")

    token = authorization[len("Bearer ") :].strip()
    return validate_token(token, auth)
