from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

_connect_args = (
    {"sslmode": "require"}
    if settings.ENVIRONMENT == "production"
    else {}
)

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    # Recycle connections every 5 minutes to prevent Supabase's pooler from
    # silently dropping idle connections (their default idle timeout is ~5 min).
    pool_recycle=300,
    # If a connection cannot be acquired within 10 s, fail fast instead of
    # hanging indefinitely — makes errors visible on the frontend immediately.
    pool_timeout=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
