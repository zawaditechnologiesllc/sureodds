from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    O_DATABASE_URL: Optional[str] = None
    DATABASE_URL: Optional[str] = None
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-key"
    API_FOOTBALL_KEY: str = ""
    SECRET_KEY: str = "changeme-in-production"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5000,https://425d1de6-3a33-4c21-bb4e-fecc8e1d8d1c-00-2bow76t85cuu9.spock.replit.dev"

    @property
    def database_url(self) -> str:
        url = self.O_DATABASE_URL or self.DATABASE_URL or os.environ.get("DATABASE_URL", "")
        if not url:
            raise ValueError("No database URL configured. Set O_DATABASE_URL or DATABASE_URL.")
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
