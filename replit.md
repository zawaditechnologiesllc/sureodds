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
- **External API**: Football-Data.org v4 for fixture data (replaces API-Football)

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
| `FOOTBALL_DATA_API_KEY` | Football-Data.org API key (free: PL, La Liga, Serie A, Bundesliga) | For predictions |
| `API_FOOTBALL_KEY` | Legacy — was used for API-Football; no longer needed | Deprecated |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for frontend | For frontend auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for frontend | For frontend auth |
| `NEXT_PUBLIC_API_URL` | Backend API URL | For frontend→backend calls |

## Key Features

- **Predictions page**: Shows today's match predictions with 1X2, Over 2.5, BTTS probabilities. Free users see 2 picks, rest are locked.
- **Results page**: Historical prediction results with win/loss record
- **Auth**: Sign up / login via Supabase
- **Admin panel**: Trigger fixture updates, run predictions, view users
- **Partner/Affiliate program**: 30% commission referral system

## Pay-as-You-Go Credits System

Users can buy pick credits to unlock locked predictions. No subscription required.

**Packages (seeded on startup):**
| Package | Picks | Price (KES) |
|---------|-------|-------------|
| Starter Pack | 2 picks | KES 10 |
| Value Pack | 5 picks | KES 20 |
| Pro Pack | 10 picks | KES 100 |

**Flow:**
1. User visits `/packages`, selects a package, enters email
2. Redirected to Paystack payment page
3. After payment, Paystack redirects back to `/packages?reference=...`
4. Frontend calls `/paystack/verify?reference=...` → credits added to `user_packages` table
5. On predictions page, locked picks show "Buy Credits" → user can use credits to unlock

**Key Endpoints:**
- `GET /packages` — list available packages (public)
- `POST /paystack/initialize` — start payment (`{package_id, email, callback_url}`)
- `GET /paystack/verify?reference=` — verify and credit account
- `GET /user-credits` — authenticated user's remaining picks
- `GET /high-confidence-picks` — today's high_confidence predictions (locked metadata)
- `POST /unlock-pick` — consume 1 credit to unlock full prediction details

## Data Pipeline Architecture (v3.0)

All fixture and result data flows through a strict scheduled-fetch-only pipeline:

```
Football-Data.org API
        │
        │  2 API calls per run × 2 runs/day = 4 calls/day max
        │  (well under free plan's 10 req/min limit)
        ↓
  Background Scheduler
  ├── 08:00 UTC: fetch today + next 3 days (1 call) + past 5 days (1 call)
  ├── 20:00 UTC: same 2 calls
  └── 06:00 UTC: generate predictions from DB form data (0 API calls)
        │
        ↓
   PostgreSQL Database  ← single source of truth for all endpoints
        │
        ↓
  FastAPI Endpoints  (read-only from DB, no per-request API calls)
```

**Covered leagues (Football-Data.org free plan):**
- Premier League (PL, ID 2021)
- La Liga (PD, ID 2014)
- Serie A (SA, ID 2019)
- Bundesliga (BL1, ID 2002)
- Note: Kenyan Premier League is not available on Football-Data.org

**Prediction engine:**
- Uses last 5 finished matches from DB per team (form score W=3/D=1/L=0)
- Goal averages: scored/conceded over last 5 games
- H2H: last 10 head-to-head matches from DB
- No external API calls — pure DB computation
- Generates: home_win%, draw%, away_win%, over25%, btts%, confidence tag

**Request counter:** In-memory daily counter (resets on server restart or at midnight).
Hard limit set to 20/day — stops fetching if exceeded. Logs every call.

## API Proxy (Dev vs Production)

- **Dev (Replit)**: `next.config.js` rewrites `/api-proxy/*` → `http://localhost:8000/*`. The frontend's `api.ts` defaults to `/api-proxy` when `NEXT_PUBLIC_API_URL` is not set.
- **Production (Vercel)**: `NEXT_PUBLIC_API_URL` is set to the Render backend URL (e.g. `https://sure-odds.onrender.com`). No rewrite needed.

## Backend Config Notes

- The backend config (`sure-odds/backend/app/core/config.py`) uses `DATABASE_URL` env var (Replit's auto-provisioned PostgreSQL) as a fallback for `O_DATABASE_URL`
- Supabase client is lazily initialized — the server starts even without valid Supabase keys, but auth features require real Supabase credentials
- CORS is configured to allow localhost and the Replit dev domain
- Paystack secret key is `LIVE_SECRET_KEY` env var (NOT `PAYSTACK_SECRET_KEY`)
- Pick packages are seeded automatically on backend startup via `seed_packages()`
