export interface Team {
  id: number;
  name: string;
  logo?: string;
}

export interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  league: string;
  leagueId: number;
  kickoff: string;
  status: "scheduled" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
}

export interface Prediction {
  matchId: number;
  match: Match;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  over25Pct: number;
  bttsPct: number;
  bestPick: "1" | "X" | "2" | "over25" | "btts" | "?";
  confidence: "high_confidence" | "high" | "medium" | "low" | "computing";
  locked?: boolean;
  computing?: boolean;
}

export interface PredictionResult {
  matchId: number;
  match: Match;
  prediction: string;
  actual: string;
  won: boolean;
  homeScore: number;
  awayScore: number;
  date: string;
}

export interface PredictionSlipItem {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  confidence: number;
}

export interface User {
  id: string;
  email: string;
  isPaid: boolean;
  referralCode: string;
  predictionScore: number;
  accuracy: number;
}

export interface ReferralStats {
  clicks: number;
  signups: number;
  earnings: number;
  pendingPayouts: number;
}

export type League = {
  id: number;
  name: string;
  slug: string;
  country: string;
};

export const LEAGUES: League[] = [
  { id: 2021, name: "Premier League", slug: "epl", country: "England" },
  { id: 2014, name: "La Liga", slug: "laliga", country: "Spain" },
  { id: 2019, name: "Serie A", slug: "seriea", country: "Italy" },
  { id: 2002, name: "Bundesliga", slug: "bundesliga", country: "Germany" },
];
