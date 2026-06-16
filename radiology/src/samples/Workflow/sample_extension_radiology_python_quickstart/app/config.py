"""Application configuration via pydantic-settings.

Settings are read from environment variables prefixed with ``DCR_RAD_`` and an
optional ``.env`` file. Nested values use a double-underscore delimiter, e.g.
``DCR_RAD_AUTHENTICATION__ENABLED=true``.

The ``Authentication`` section mirrors the keys in the C# Quickstart's
``appsettings.json``. Authentication is disabled by default for local
development; partners enable it intentionally when hardening for production.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class RequiredClaims(BaseModel):
    """Claims an inbound token must satisfy (mirrors C# RequiredClaims)."""

    # Token identity type must be "app" (application token, not a user token).
    idtyp: list[str] = Field(default_factory=lambda: ["app"])
    # Allowed authorized-party (azp) client IDs — the Dragon Copilot Extensions
    # Runtime application(s) permitted to call this extension.
    azp: list[str] = Field(default_factory=lambda: ["<ALLOWED_CALLER_CLIENT_ID>"])


class AuthenticationSettings(BaseModel):
    """Microsoft Entra ID JWT validation settings (mirrors C# Authentication)."""

    enabled: bool = False
    tenant_id: str = Field(default="<YOUR_ENTRA_TENANT_ID>", alias="TenantId")
    client_id: str = Field(default="<YOUR_APP_REGISTRATION_CLIENT_ID>", alias="ClientId")
    instance: str = Field(default="https://login.microsoftonline.com/", alias="Instance")
    required_claims: RequiredClaims = Field(
        default_factory=RequiredClaims, alias="RequiredClaims"
    )

    model_config = SettingsConfigDict(populate_by_name=True)

    @property
    def authority(self) -> str:
        """The Entra ID authority base URL for the configured tenant."""

        return f"{self.instance.rstrip('/')}/{self.tenant_id}"

    @property
    def jwks_uri(self) -> str:
        """The JWKS endpoint advertised by the v2.0 OpenID metadata."""

        return f"{self.authority}/discovery/v2.0/keys"

    @property
    def valid_issuers(self) -> list[str]:
        """Accepted token issuers (v2.0 and v1.0 endpoints)."""

        return [
            f"{self.authority}/v2.0",
            f"https://sts.windows.net/{self.tenant_id}/",
        ]


class Settings(BaseSettings):
    """Top-level application settings."""

    model_config = SettingsConfigDict(
        env_prefix="DCR_RAD_",
        env_nested_delimiter="__",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "Sample Radiology Extension (Python)"
    version: str = "0.0.1"
    mock_data_file: str = "MockData/qualitycheck_response.json"
    authentication: AuthenticationSettings = Field(default_factory=AuthenticationSettings)


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()
