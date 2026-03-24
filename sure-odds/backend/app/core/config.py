from pydantic_settings import BaseSettings
from typing import List, Optional
import os
import secrets


class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = None

    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"
    API_FOOTBALL_KEY: str = ""

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = "pk_live_9c64461a7ca5eb52276189daf930f00dc7e24a6d"

    SECRET_KEY: str = secrets.token_hex(32)
    ENVIRONMENT: str = "development"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5000"

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL or os.environ.get("DATABASE_URL", "")
        if not url:
            raise ValueError("DATABASE_URL is not set.")
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def validate_production(self):
        errors = []
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL")
        if "placeholder" in self.SUPABASE_URL:
            errors.append("SUPABASE_URL")
        if "placeholder" in self.SUPABASE_SERVICE_ROLE_KEY:
            errors.append("SUPABASE_SERVICE_ROLE_KEY")
        if not self.API_FOOTBALL_KEY:
            errors.append("API_FOOTBALL_KEY")
        if not self.PAYSTACK_SECRET_KEY:
            errors.append("PAYSTACK_SECRET_KEY")
        if errors:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(errors)}"
            )

    class Config:
        env_file = ".env"


settings = Settings()
