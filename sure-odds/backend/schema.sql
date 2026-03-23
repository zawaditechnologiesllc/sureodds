-- Sure Odds — Neon PostgreSQL Schema
-- Run this against your Neon database to set up tables

-- Users table (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,           -- Supabase auth user ID
    email VARCHAR UNIQUE NOT NULL,
    subscription_status VARCHAR NOT NULL DEFAULT 'free',  -- free | paid | cancelled
    referral_code VARCHAR UNIQUE NOT NULL,
    referred_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    prediction_score FLOAT DEFAULT 0.0,
    accuracy_pct FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
    id INTEGER PRIMARY KEY,           -- API-Football league ID
    name VARCHAR NOT NULL,
    country VARCHAR NOT NULL,
    logo_url VARCHAR,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO leagues (id, name, country) VALUES
    (39, 'Premier League', 'England'),
    (140, 'La Liga', 'Spain'),
    (1644, 'Kenyan Premier League', 'Kenya'),
    (135, 'Serie A', 'Italy'),
    (78, 'Bundesliga', 'Germany')
ON CONFLICT (id) DO NOTHING;

-- Fixtures
CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY,           -- API-Football fixture ID
    league_id INTEGER REFERENCES leagues(id) NOT NULL,
    home_team_id INTEGER NOT NULL,
    home_team_name VARCHAR NOT NULL,
    home_team_logo VARCHAR,
    away_team_id INTEGER NOT NULL,
    away_team_name VARCHAR NOT NULL,
    away_team_logo VARCHAR,
    kickoff TIMESTAMPTZ NOT NULL,
    status VARCHAR DEFAULT 'scheduled',  -- scheduled | live | finished
    home_score INTEGER,
    away_score INTEGER,
    season INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures(kickoff);
CREATE INDEX IF NOT EXISTS idx_fixtures_league ON fixtures(league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);

-- Predictions
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER REFERENCES fixtures(id) UNIQUE NOT NULL,
    home_win_pct FLOAT NOT NULL,
    draw_pct FLOAT NOT NULL,
    away_win_pct FLOAT NOT NULL,
    over25_pct FLOAT NOT NULL,
    btts_pct FLOAT NOT NULL,
    best_pick VARCHAR NOT NULL,         -- 1 | X | 2 | over25 | btts
    confidence VARCHAR NOT NULL,        -- high | medium | low
    is_locked BOOLEAN DEFAULT TRUE,
    prediction_date TIMESTAMPTZ DEFAULT NOW(),
    is_correct BOOLEAN,
    actual_result VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_predictions_fixture ON predictions(fixture_id);

-- Referral Earnings
CREATE TABLE IF NOT EXISTS referral_earnings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id) NOT NULL,            -- The referrer
    referred_user_id VARCHAR REFERENCES users(id) NOT NULL,   -- Who they referred
    amount FLOAT NOT NULL,                                     -- 30% of subscription
    subscription_amount FLOAT NOT NULL,
    commission_rate FLOAT DEFAULT 0.30,
    status VARCHAR DEFAULT 'pending',   -- pending | paid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_earnings_user ON referral_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON referral_earnings(status);
