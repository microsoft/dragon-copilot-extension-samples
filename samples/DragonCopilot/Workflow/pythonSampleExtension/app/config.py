from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DGEXT_")

    app_name: str = "Dragon Sample Extension (Python)"
    version: str = "0.1.0"
    # enable_auth: bool = False  # Placeholder toggle — not referenced anywhere yet; uncomment when auth middleware is wired up

@lru_cache
def get_settings() -> Settings:
    return Settings()
