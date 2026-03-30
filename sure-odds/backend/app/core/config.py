from pydantic_settings import BaseSettings
from typing import List, Optional
import os
import secrets
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = None
    DIRECT_DATABASE_URL: Optional[str] = None

    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"

    # Football-Data.org API key (new data source)
    # Store as FOOTBALL_DATA_API_KEY in .env / environment secrets
    FOOTBALL_DATA_API_KEY: str = ""

    # Legacy — kept so the admin page key-configured check still works
    # during transition. Can be removed once FOOTBALL_DATA_API_KEY is set.
    API_FOOTBALL_KEY: str = ""

    LIVE_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = "pk_live_9c64461a7ca5eb52276189daf930f00dc7e24a6d"

    @property
    def paystack_secret_key(self) -> str:
        return self.LIVE_SECRET_KEY

    SECRET_KEY: str = secrets.token_hex(32)
    ADMIN_EMAIL: str = "info@sureodds.pro"
    ENVIRONMENT: str = "development"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5000"

    @property
    def active_api_key(self) -> str:
        """Return whichever API key is configured (Football-Data.org preferred)."""
        return self.FOOTBALL_DATA_API_KEY or self.API_FOOTBALL_KEY

    @staticmethod
    def _clean_db_url(url: str) -> str:
        """Normalise a PostgreSQL URL for psycopg2 / SQLAlchemy.

        1. Converts postgres:// → postgresql://
        2. Strips query parameters that psycopg2 does not recognise
           (e.g. Supabase appends `supa=base-pooler.x` which causes a crash).
        """
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        parsed = urlparse(url)
        if parsed.query:
            _SUPPORTED = {"sslmode", "sslcert", "sslkey", "sslrootcert", "sslcrl", "connect_timeout", "application_name"}
            qs = parse_qs(parsed.query, keep_blank_values=True)
            cleaned = {k: v for k, v in qs.items() if k in _SUPPORTED}
            url = urlunparse(parsed._replace(query=urlencode(cleaned, doseq=True)))

        return url

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL or os.environ.get("DATABASE_URL", "")
        if not url:
            raise ValueError("DATABASE_URL is not set.")
        return self._clean_db_url(url)

    @property
    def migration_database_url(self) -> str:
        """Direct (non-pooled) connection URL for Alembic migrations.
        Falls back to database_url if DIRECT_DATABASE_URL is not set."""
        raw = self.DIRECT_DATABASE_URL or os.environ.get("DIRECT_DATABASE_URL", "")
        if not raw:
            return self.database_url
        return self._clean_db_url(raw)

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
        if not self.FOOTBALL_DATA_API_KEY:
            errors.append("FOOTBALL_DATA_API_KEY")
        if errors:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(errors)}"
            )

    class Config:
        env_file = ".env"


settings = Settings()
