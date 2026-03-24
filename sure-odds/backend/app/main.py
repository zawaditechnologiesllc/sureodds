from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.routers import predictions, results, users, referrals, admin

if settings.ENVIRONMENT == "production":
    settings.validate_production()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sure Odds API",
    description="Sports prediction SaaS backend",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(users.router)
app.include_router(referrals.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sure-odds-api"}


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}
