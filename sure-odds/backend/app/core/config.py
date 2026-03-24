from pydantic_settings import BaseSettings
from typing import List, Optional
import os
import secrets


class Settings(BaseSettings):
    O_DATABASE_URL: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    API_FOOTBALL_KEY: str = ""

    SECRET_KEY: str = secrets.token_hex(32)
    ENVIRONMENT: str = "development"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5000"

    @property
    def database_url(self) -> str:
        url = self.O_DATABASE_URL or self.DATABASE_URL or os.environ.get("DATABASE_URL", "")
        if not url:
            raise ValueError("No database URL configured. Set DATABASE_URL.")
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def validate_production(self):
        """Call this on startup in production to catch missing env vars early."""
        errors = []
        if "placeholder" in self.SUPABASE_URL:
            errors.append("SUPABASE_URL is not set")
        if "placeholder" in self.SUPABASE_SERVICE_ROLE_KEY:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is not set")
        if not self.API_FOOTBALL_KEY:
            errors.append("API_FOOTBALL_KEY is not set")
        if errors:
            raise EnvironmentError(
                f"Missing required environment variables for production: {', '.join(errors)}"
            )

    class Config:
        env_file = ".env"


settings = Settings()
