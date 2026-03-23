"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import ResultCard from "@/components/matches/ResultCard";
import { CheckCircle, XCircle, TrendingUp } from "lucide-react";
import type { PredictionResult } from "@/types";

const MOCK_RESULTS: PredictionResult[] = [
  {
    matchId: 101,
    match: {
      id: 101,
      homeTeam: { id: 1, name: "Man City" },
      awayTeam: { id: 2, name: "Wolves" },
      league: "Premier League",
      leagueId: 39,
      kickoff: new Date(Date.now() - 86400000).toISOString(),
      status: "finished",
    },
    prediction: "Home Win",
    actual: "Home Win",
    won: true,
    homeScore: 3,
    awayScore: 1,
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    matchId: 102,
    match: {
      id: 102,
      homeTeam: { id: 3, name: "Liverpool" },
      awayTeam: { id: 4, name: "Brentford" },
      league: "Premier League",
      leagueId: 39,
      kickoff: new Date(Date.now() - 86400000).toISOString(),
      status: "finished",
    },
    prediction: "Home Win",
    actual: "Draw",
    won: false,
    homeScore: 1,
    awayScore: 1,
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    matchId: 103,
    match: {
      id: 103,
      homeTeam: { id: 5, name: "Real Madrid" },
      awayTeam: { id: 6, name: "Sevilla" },
      league: "La Liga",
      leagueId: 140,
      kickoff: new Date(Date.now() - 86400000).toISOString(),
      status: "finished",
    },
    prediction: "Over 2.5",
    actual: "Over 2.5",
    won: true,
    homeScore: 2,
    awayScore: 1,
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    matchId: 104,
    match: {
      id: 104,
      homeTeam: { id: 7, name: "Gor Mahia" },
      awayTeam: { id: 8, name: "Sofapaka" },
      league: "Kenyan Premier League",
      leagueId: 1644,
      kickoff: new Date(Date.now() - 86400000).toISOString(),
      status: "finished",
    },
    prediction: "Home Win",
    actual: "Home Win",
    won: true,
    homeScore: 2,
    awayScore: 0,
    date: new Date(Date.now() - 86400000).toISOString(),
  },
];

const won = MOCK_RESULTS.filter((r) => r.won).length;
const accuracy = Math.round((won / MOCK_RESULTS.length) * 100);

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-white font-black text-2xl mb-1">Yesterday&apos;s Results</h1>
          <p className="text-brand-muted text-sm">
            Full transparency — see how our predictions performed
          </p>
        </div>

        {/* Accuracy Summary */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-muted text-sm mb-1">Overall Accuracy (Yesterday)</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-green" />
                <span className="text-white font-black text-3xl">{accuracy}%</span>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-5 h-5 text-brand-green mb-1" />
                <span className="text-white font-black text-xl">{won}</span>
                <span className="text-brand-muted text-xs">Won</span>
              </div>
              <div className="flex flex-col items-center">
                <XCircle className="w-5 h-5 text-brand-red mb-1" />
                <span className="text-white font-black text-xl">{MOCK_RESULTS.length - won}</span>
                <span className="text-brand-muted text-xs">Lost</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-brand-muted text-2xl font-black mb-1">
                  {MOCK_RESULTS.length}
                </span>
                <span className="text-brand-muted text-xs">Total</span>
              </div>
            </div>
          </div>

          {/* Accuracy Bar */}
          <div className="mt-4">
            <div className="h-2 bg-brand-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all"
                style={{ width: `${accuracy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-3">
          {MOCK_RESULTS.map((result) => (
            <ResultCard key={result.matchId} result={result} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-brand-muted text-xs">
            Results updated daily. All predictions are logged before matches kick off.
          </p>
        </div>
      </div>

      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
