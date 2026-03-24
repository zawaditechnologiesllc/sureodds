# Sure Odds — Sports Prediction Platform

## Overview

Sure Odds is a sports prediction SaaS platform that provides AI-powered football predictions with confidence ratings and probability breakdowns. It features a paywall where free users get 2 predictions per day, while paid members get unlimited access.

## Stack

### Frontend (Next.js)
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Auth**: Supabase Auth
- **State**: Zustand + TanStack Query
- **UI**: Lucide React, react-hot-toast

### Backend (FastAPI/Python)
- **Framework**: FastAPI + Uvicorn
- **Database**: SQLAlchemy + Alembic migrations
- **Auth**: Supabase (server-side token validation)
- **Scheduler**: APScheduler
- **External API**: API-Football for fixture data

### Workspace Infrastructure (pnpm monorepo)
- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)

## Structure

```text
workspace/
├── sure-odds/
│   ├── frontend/           # Next.js 14 app (port 5000)
│   └── backend/            # FastAPI Python API (port 8000)
├── artifacts/              # Workspace deployable apps
│   └── api-server/         # Express API server
├── lib/                    # Shared TypeScript libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
└── replit.md
```

## Running the Application

Two workflows run in parallel:
1. **Start application** — `pnpm --filter sure-odds-frontend run dev` (port 5000, webview)
2. **Backend API** — `cd sure-odds/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (port 8000, console)

## Environment Variables / Secrets Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Replit) | Yes |
| `O_DATABASE_URL` | Alternative DB URL (overrides DATABASE_URL) | No |
| `SUPABASE_URL` | Supabase project URL | For auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | For auth |
| `API_FOOTBALL_KEY` | API-Football.com API key for fixture data | For predictions |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for frontend | For frontend auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for frontend | For frontend auth |
| `NEXT_PUBLIC_API_URL` | Backend API URL | For frontend→backend calls |

## Key Features

- **Predictions page**: Shows today's match predictions with 1X2, Over 2.5, BTTS probabilities
- **Results page**: Historical prediction results with win/loss record
- **Auth**: Sign up / login via Supabase
- **Admin panel**: Trigger fixture updates, run predictions, view users
- **Partner/Affiliate program**: 30% commission referral system

## Backend Config Notes

- The backend config (`sure-odds/backend/app/core/config.py`) uses `DATABASE_URL` env var (Replit's auto-provisioned PostgreSQL) as a fallback for `O_DATABASE_URL`
- Supabase client is lazily initialized — the server starts even without valid Supabase keys, but auth features require real Supabase credentials
- CORS is configured to allow localhost and the Replit dev domain
