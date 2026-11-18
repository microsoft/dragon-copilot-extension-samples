"""Entra ID JWT authentication toggle tests.

These run hermetically: a local RSA key pair signs the test token and an
injected signing-key resolver returns the matching public key, so no network
call to Entra ID is made.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth as auth_module
from app.config import (
    AuthenticationSettings,
    RequiredClaims,
    Settings,
    get_settings,
)
from app.main import app

_TENANT_ID = "11111111-1111-1111-1111-111111111111"
_CLIENT_ID = "22222222-2222-2222-2222-222222222222"
_CALLER_ID = "33333333-3333-3333-3333-333333333333"


@pytest.fixture()
def rsa_key_pair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture()
def auth_enabled_client(rsa_key_pair):
    private_key, public_key = rsa_key_pair

    enabled_settings = Settings(
        authentication=AuthenticationSettings(
            enabled=True,
            tenant_id=_TENANT_ID,
            client_id=_CLIENT_ID,
            required_claims=RequiredClaims(idtyp=["app"], azp=[_CALLER_ID]),
        )
    )

    app.dependency_overrides[get_settings] = lambda: enabled_settings

    class _StubResolver:
        def get_signing_key(self, token: str):
            return public_key

    auth_module.set_signing_key_resolver_factory(lambda auth: _StubResolver())

    try:
        yield TestClient(app), enabled_settings.authentication, private_key
    finally:
        app.dependency_overrides.pop(get_settings, None)
        auth_module.reset_signing_key_resolver_factory()


def _make_token(private_key, auth: AuthenticationSettings) -> str:
    now = datetime.now(tz=timezone.utc)
    claims = {
        "iss": f"{auth.authority}/v2.0",
        "aud": auth.client_id,
        "azp": _CALLER_ID,
        "idtyp": "app",
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(claims, private_key, algorithm="RS256")


def test_enabled_without_token_returns_401(auth_enabled_client, sample_request):
    client, _auth, _private_key = auth_enabled_client
    response = client.post("/v1/process", json=sample_request)
    assert response.status_code == 401


def test_enabled_with_valid_token_returns_200(auth_enabled_client, sample_request):
    client, auth, private_key = auth_enabled_client
    token = _make_token(private_key, auth)

    response = client.post(
        "/v1/process",
        json=sample_request,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    recommendations = response.json()["payload"]["qualityCheckResult"]["recommendations"]
    assert len(recommendations) == 3
