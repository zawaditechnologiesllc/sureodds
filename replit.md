# Sure Odds — Sports Prediction Platform

## Roadmap Features Implemented (April 2026 — Batch 2)

### Priority 2 — Logistic Regression Weight Re-Fitting
- `scikit-learn` and `slowapi` added to `requirements.txt`
- New `model_weights` DB table (stores: poisson_weight, strength_weight, form_weight, h2h_weight, home_adv_weight, sample_size, cv_accuracy)
- New `logistic_regression_service.py` — trains LR on (home_form_score, away_form_score, h2h_adv_score, home_xg, away_xg) → is_correct; derives optimal blending weights; stores in DB
- `prediction_engine.py` updated: `_strength_model()` now accepts fitted weights as params; `_assemble()` reads LR weights from DB and replaces hardcoded 50/50 / 55/30/15 splits when available; `generate_prediction()` now stores feature columns (home_form_score, away_form_score, h2h_adv_score) in every prediction row for future training
- Requires ≥ 300 settled predictions with v3 feature columns; silently falls back to hardcoded defaults until then

### Priority 3 — 60-Day Historical Backfill
- New `POST /admin/backfill?days_back=60` endpoint in admin.py — runs as background task; fetches N days of history then re-reconciles results
- Frontend: "60-Day Backfill" button in admin overview Engine Accuracy panel; triggers with toast confirmation
- New API helper `triggerBackfill(daysBack)` in api.ts

### Priority 4 — xG Display on Prediction Cards
- `PredictionOut` in `fixtures.py` and `predictions.py` now include `homeXg` and `awayXg` optional fields
- `Prediction` type in `types/index.ts` extended with `homeXg?: number` and `awayXg?: number`
- `MatchCard.tsx` updated — shows "xG 1.8" / "xG 0.9" labels inline next to each team name for unlocked, non-computing predictions

### Priority 5 — Daily Bundle Auto-Generation at 07:00 UTC
- `run_daily_bundle_generation()` async function added to `main.py`
- APScheduler cron job: `bundle_daily_07h` — fires every day at 07:00 UTC, generates all 4 tiers (safe, medium, high, mega) via existing `generate_and_save_bundle()` service

### Priority 6 — Admin Accuracy Panel
- Engine Accuracy panel added to admin overview tab
- Shows: Total Settled, Overall Accuracy %, Last 7 Days Accuracy, per-tier breakdown (high_confidence/high/medium/low hit rates)
- Loads on tab open; manual refresh button available
- New API helpers: `fetchEngineAccuracy()`, `fetchEngineWeights()`, `triggerTrainModel()`, `triggerBackfill()`

### Priority 6 — LR Model Training (Admin)
- `POST /admin/engine/train` — triggers LR training immediately (useful for testing before weekly job fires)
- `GET /admin/engine/weights` — returns current fitted weights or message that defaults are in use
- Weekly scheduler job: `lr_weekly_sun_03h` — every Sunday at 03:00 UTC
- Admin panel: "Train LR Model" button in Engine Accuracy section; shows sample count and CV accuracy on success

### Priority 6 — Score Re-Reconciliation on Correction
- `results_service.py` updated: if `prediction.actual_result != actual` (score changed after settlement), re-evaluates `is_correct` and updates — handles score corrections after initial settlement

### Priority 6 — Rate Limiting
- `slowapi` integrated globally — 60 requests per minute per IP
- `Limiter` attached to app state; `RateLimitExceeded` handler registered

## Key Fixes Applied (April 2026)
- **VIP currency fix**: User VIP page (`/vip`) was hardcoding `$` (USD) for all plan prices. DB stores VIP packages in KES. Fixed by: (1) carrying `currency` field through the live-package merge, (2) adding `formatPlanPrice` helper that shows `KSh` for KES and `$` for USD. Removed broken `useCurrency`/`formatPrice` usage that was treating KES amounts as USD and double-converting them.
- **CRITICAL BUG FIX**: `predictions/page.tsx` was calling `getDateStr(filter)` which was never defined — this threw a `ReferenceError` at runtime and silently prevented all predictions from loading. Also, the old call passed a client-side date string as the `relative` param instead of `"today"`/`"tomorrow"`. Fixed: removed `getDateStr`, now passes `filter` directly as `relative` (type-cast to `"today" | "tomorrow"`) so the backend always computes the correct server-side date. This resolves the mismatch where admin showed 46 fixtures but users saw none.

- **CRITICAL BUG FIX**: Fixed `/paystack/status` — was only checking `subscription_status == "paid"` but VIP users are stored in `user_vip_access` table. VIP customers now correctly show as paid/VIP active. Response now includes `vip_active` and `vip_expires_at` fields.
- Dashboard (`/dashboard`) updated: VIP users now see a gold "VIP Active" crown badge with their expiry date instead of "Free Plan". Stats row shows "VIP" plan with correct color. Imports Crown and Clock icons.
- Admin panel: Supabase sync button promoted from Users tab → now also on the Overview tab as a prominent card with description ("Sync from Supabase"). Fixes cases where Supabase auth users aren't in the backend DB.
- **Predictions not showing to users** — Root causes fixed:
  1. Admin stats now report `scheduled_today` (what users see) vs `today_predictions` (misleading all-matches count).
  2. `run-today` and `run-tomorrow` now scrape Sofascore first, then generate predictions.
  3. `run-update` endpoint (used by "Fetch + Predict" button) now also generates predictions after fetching.
  4. Admin overview now shows a red warning banner when `scheduled_today == 0` and a green confirmation when > 0.
- **Timezone fix**: Predictions and results pages now use local calendar date (not UTC) for day filtering, fixing the issue for users in UTC+3 (EAT) checking at midnight.

## Key Fixes Applied (March 2026)
- Removed duplicate `next.config.js` — merged into single `next.config.mjs` (was causing Vercel build failure)
- Fixed league IDs in `src/types/index.ts` — updated to Football-Data.org IDs (2021/2014/2019/2002 instead of old 39/140/135/78)
- Fixed API URL fallback in `results/page.tsx` — now uses `/api-proxy` instead of `http://localhost:8000` for client components
- Fixed fixture fetching — API calls only made when `FOOTBALL_DATA_API_KEY` is set (no more wasted calls at startup)
- Added idempotent Alembic migration — uses `IF NOT EXISTS` checks so Render build doesn't crash on re-deploy
- Added `DIRECT_DATABASE_URL` support for running Alembic migrations via direct Supabase connection (bypasses pgbouncer)
- Added `FOOTBALL_DATA_API_KEY` and `LIVE_SECRET_KEY` to render.yaml env var list
- **CRITICAL BUG FIX**: Fixed bundle payment verify route — `/verify/payment` was declared after `/{bundle_id}`, so FastAPI matched "verify" as a bundle ID and every payment return 404'd. Moved fixed route before parameterised route.
- Changed scheduler from every 10 minutes → **every 6 hours** (4 API calls/day max, was 144/day). `MAX_DAILY_REQUESTS` lowered from 200 → 20.
- Changed results reconciliation window from 5 days → **7 days** to match the 7-day display window on the results page.
- Fixed `reconcile_results` date filter: changed `< today` to `<= today` so same-day finished matches are included.
- Results endpoint now enforces a **7-day expiry**: dates older than 7 days return empty rather than showing stale data.
- Admin panel: added **Publish / Unpublish** toggle buttons per bundle row. Admin can deactivate a bundle (hides from users) or reactivate it without regenerating.
- Backend: added `POST /admin/bundles/{id}/activate` endpoint to complement the existing `/deactivate`.
- Updated admin panel Data Source Status panel to accurately show "every 6 hours" and poll interval from live API response.

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
- **Data source**: Sofascore internal API (no key required) — replaces Football-Data.org

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
| `FOOTBALL_DATA_API_KEY` | Deprecated — Sofascore scraper needs no API key | No longer needed |
| `API_FOOTBALL_KEY` | Deprecated — legacy key, no longer used | Deprecated |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for frontend | For frontend auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for frontend | For frontend auth |
| `NEXT_PUBLIC_API_URL` | Backend API URL | For frontend→backend calls |

## Key Features

- **Fixtures page** (`/predictions`): Shows today's match predictions with 1X2, Over 2.5, BTTS probabilities. Free users see 2 picks, rest are locked.
- **Results page**: Historical prediction results with win/loss record
- **Bundles page** (`/bundles`): Pre-generated AI betting combos sold by tier. Picks hidden until purchased.
- **Auth**: Sign up / login via Supabase
- **Admin panel**: Trigger fixture updates, run predictions, generate bundles, view users
- **Partner/Affiliate program**: 30% commission referral system
- **Partner Dashboard** (`/partner-dashboard`): Full affiliate dashboard for approved partners

## Partner Dashboard System

Partners access `/partner-dashboard` after logging in with their regular account (approved via admin panel).

**Features:**
- Overview tab: Click tracking, signup count, conversion rate funnel, total sales, commission breakdown (pending vs paid)
- Referrals tab: Table of all referred users with purchase status and commission earned per user (email partially masked)
- Payout Settings tab: USDT TRC-20 wallet or bank transfer (name, IBAN, SWIFT, country)
- Referral link with one-click copy button
- Auto-refresh stats button

**Commission flow:**
1. Partner applies at `/partner` → admin approves in `/admin` panel
2. Admin approval auto-links `PartnerApplication.user_id` by email lookup
3. When approved, partner's referral link is `https://sureodds.pro/invite?code=SURE-XXXXXXXX`
4. Visitor hits `/invite?code=...` → click is tracked in `referral_clicks` table (deduped by IP hash per day)
5. Visitor signs up at `/auth/signup?ref=CODE` → `User.referred_by` is set to partner's user ID
6. Partner receives email notification (requires SMTP env vars)
7. When referred user pays → `ReferralEarning` record created (30% of purchase amount, status=pending)
8. Admin pays out every 72 hours via USDT TRC-20 or bank transfer → marks earnings as `status=paid`

**New Backend Models:**
- `partner_payout_settings` — per-partner payout method (USDT address or bank details)
- `referral_clicks` — click tracking with IP hash deduplication (privacy-safe)

**New API Endpoints (`/partner-dashboard/`):**
- `GET /status` — check if authenticated user is an approved partner
- `GET /stats` — full analytics (requires approved partner)
- `GET /payout-settings` — current payout method
- `POST /payout-settings` — save/update payout method
- `POST /track-click` — called from `/invite` page, records a referral link click

**Email Notifications (opt-in via SMTP):**
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars to enable
- Partners receive email when a new user signs up via their referral link
- Email includes link to partner dashboard

**Payout info shown to partners:**
- Paid every 72 hours automatically
- Minimum payout: $10
- USDT TRC-20: arrives within minutes
- Bank transfer: 2–3 business days

## Bundle System (NEW)

Bundles are pre-generated probability-weighted betting combos assembled from high-confidence predictions.

**Bundle Tiers:**
| Tier | Target Odds | Picks | Price |
|------|-------------|-------|-------|
| Safe Slip | 5–10x | 3–5 | $10 |
| Medium Slip | 20–50x | 5–8 | $20 |
| High Roller | 100–300x | 8–12 | $30 |
| Mega Slip | 500–1000x | 10–15 | $50 |

**Bundle Generator (`sure-odds/backend/app/services/bundle_generator.py`):**
- Builds match pool from upcoming scheduled fixtures with predictions
- Filters to confidence ≥ 60%
- Selects from top-10 by confidence with randomness (varied bundles each run)
- Multiplies odds until target reached, respects min/max pick limits
- Pre-generated by admin — never on demand per user

**Bundle Flow:**
1. Admin goes to `/admin` → Bundles tab → clicks "Generate [Tier]"
2. Backend assembles picks, saves to `bundles` table, deactivates old same-tier bundle
3. Users see bundle tiers on `/bundles` page (picks hidden, only total_odds + pick_count shown)
4. User pays via Paystack → `bundle_purchases` table updated
5. After payment verification, full picks revealed

**New Database Tables:**
- `bundles` — bundle records (id UUID, name, total_odds, picks JSON, tier, price, is_active, expires_at)
- `bundle_purchases` — purchase records (bundle_id, user_id, reference, status)

**New API Endpoints:**
- `GET /bundles` — list active bundles (picks hidden unless purchased)
- `GET /bundles/{id}` — single bundle
- `POST /bundles/{id}/purchase` — initialize Paystack payment for bundle
- `GET /bundles/verify/payment?reference=` — verify and unlock picks
- `GET /admin/bundles` — admin: list all bundles
- `POST /admin/bundles/generate/{tier}` — admin: generate bundle for tier

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

## Data Pipeline Architecture (v4.0 — Sofascore)

All fixture data is scraped from Sofascore's public internal API. No API key required.

```
Sofascore Internal API (api.sofascore.com)
        │
        │  1 HTTP request per date (browser-like headers)
        │  ~0.4s delay between requests to avoid rate-limiting
        ↓
  Background Scheduler
  ├── Every 2 hours: fetch 7d back → today → 7d ahead (15 HTTP calls)
  ├── Every 2 minutes: fetch live events, update scores
  └── After fixture fetch: generate predictions from DB (0 API calls)
        │
        ↓
   PostgreSQL Database  ← single source of truth for all endpoints
        │
        ↓
  FastAPI Endpoints  (read-only from DB, no per-request scraping)
```

**Covered leagues (Sofascore whitelist — name-based matching):**
- Top European: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga, Super Lig, Championship
- Continental: Champions League, Europa League, Conference League, Copa Libertadores, CAF Champions League
- Africa: FKF Premier League (Kenya), DStv Premiership (South Africa), NPFL (Nigeria), Egyptian Premier League, Tanzania NBC, Uganda Super League
- Other: MLS, Liga MX, Saudi Pro League, etc.
- Admin can enable/disable any league from the leagues table (is_active toggle)

**Prediction engine:**
- Uses last 5 finished matches from DB per team (form score W=3/D=1/L=0)
- Goal averages: scored/conceded over last 5 games
- H2H: last 10 head-to-head matches from DB
- No external API calls — pure DB computation
- Generates: home_win%, draw%, away_win%, over25%, btts%, confidence tag

**Fixture model extended with odds fields:**
- `home_odds`, `draw_odds`, `away_odds` (Float, nullable) — populated when Sofascore provides them

## API Proxy (Dev vs Production)

- **Dev (Replit)**: `next.config.js` rewrites `/api-proxy/*` → `http://localhost:8000/*`. The frontend's `api.ts` defaults to `/api-proxy` when `NEXT_PUBLIC_API_URL` is not set.
- **Production (Vercel)**: `NEXT_PUBLIC_API_URL` is set to the Render backend URL (e.g. `https://sure-odds.onrender.com`). No rewrite needed.

## Backend Config Notes

- The backend config (`sure-odds/backend/app/core/config.py`) uses `DATABASE_URL` env var (Replit's auto-provisioned PostgreSQL) as a fallback for `O_DATABASE_URL`
- Supabase client is lazily initialized — the server starts even without valid Supabase keys, but auth features require real Supabase credentials
- CORS is configured to allow localhost and the Replit dev domain
- Paystack secret key is `LIVE_SECRET_KEY` env var (NOT `PAYSTACK_SECRET_KEY`)
- Pick packages are seeded automatically on backend startup via `seed_packages()`
