from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Dragon Sample Extension (Python)"
    version: str = "0.1.0"
    enable_auth: bool = False  # Placeholder toggle

    class Config:
        env_prefix = "DGEXT_"

@lru_cache
def get_settings() -> Settings:
    return Settings()
