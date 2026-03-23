# Sure Odds — Sports Prediction SaaS Platform

A SportPesa-style sports prediction platform focused on **odds prediction and analytics** (NOT placing bets).

## Tech Stack

- **Frontend**: Next.js 14 (App Router) — Deploy on Vercel
- **Backend**: FastAPI (Python 3.11+) — Deploy on Render
- **Database**: Neon PostgreSQL
- **Auth**: Supabase Auth
- **Prediction Data**: API-Football

## Project Structure

```
sure-odds/
├── frontend/          # Next.js app (Vercel)
└── backend/           # FastAPI app (Render)
```

## Features

- 🎯 **Prediction Engine** — Home Win %, Draw %, Away Win %, Over 2.5, BTTS
- 🎮 **SportPesa-style UI** — Match cards, odds-style buttons, prediction slip
- 💰 **Referral System** — 30% commission on subscription revenue
- 🔐 **Paywall** — Free users see results; paid users see predictions
- 📊 **Admin Panel** — Manage users, predictions, fixtures
- 📱 **Mobile-first** — Sticky bottom nav, responsive layout

## Getting Started

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in your environment variables
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your environment variables
uvicorn app.main:app --reload
```

## Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (`.env`)
```
DATABASE_URL=your_neon_postgres_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
API_FOOTBALL_KEY=your_api_football_key
SECRET_KEY=your_secret_key
```

## Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

### Render (Backend)
1. Create new Web Service on Render
2. Connect GitHub repo
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables
