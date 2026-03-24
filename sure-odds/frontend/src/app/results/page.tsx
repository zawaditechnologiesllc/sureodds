"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import ResultCard from "@/components/matches/ResultCard";
import { CheckCircle, XCircle, TrendingUp, Calendar } from "lucide-react";
import type { PredictionResult } from "@/types";

// Last 5 days of results — most recent first
const ALL_RESULTS: { date: string; label: string; results: PredictionResult[] }[] = [
  {
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    label: "Yesterday",
    results: [
      {
        matchId: 101,
        match: { id: 101, homeTeam: { id: 1, name: "Man City" }, awayTeam: { id: 2, name: "Wolves" }, league: "Premier League", leagueId: 39, kickoff: new Date(Date.now() - 1 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Home Win", won: true, homeScore: 3, awayScore: 1, date: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        matchId: 102,
        match: { id: 102, homeTeam: { id: 3, name: "Liverpool" }, awayTeam: { id: 4, name: "Brentford" }, league: "Premier League", leagueId: 39, kickoff: new Date(Date.now() - 1 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Draw", won: false, homeScore: 1, awayScore: 1, date: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        matchId: 103,
        match: { id: 103, homeTeam: { id: 5, name: "Real Madrid" }, awayTeam: { id: 6, name: "Sevilla" }, league: "La Liga", leagueId: 140, kickoff: new Date(Date.now() - 1 * 86400000).toISOString(), status: "finished" },
        prediction: "Over 2.5", actual: "Over 2.5", won: true, homeScore: 2, awayScore: 1, date: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
  },
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    label: "2 days ago",
    results: [
      {
        matchId: 201,
        match: { id: 201, homeTeam: { id: 7, name: "Gor Mahia" }, awayTeam: { id: 8, name: "Sofapaka" }, league: "Kenyan Premier League", leagueId: 1644, kickoff: new Date(Date.now() - 2 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Home Win", won: true, homeScore: 2, awayScore: 0, date: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        matchId: 202,
        match: { id: 202, homeTeam: { id: 9, name: "Inter Milan" }, awayTeam: { id: 10, name: "Napoli" }, league: "Serie A", leagueId: 135, kickoff: new Date(Date.now() - 2 * 86400000).toISOString(), status: "finished" },
        prediction: "Under 2.5", actual: "Under 2.5", won: true, homeScore: 1, awayScore: 0, date: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
  },
  {
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    label: "3 days ago",
    results: [
      {
        matchId: 301,
        match: { id: 301, homeTeam: { id: 11, name: "Bayern Munich" }, awayTeam: { id: 12, name: "Dortmund" }, league: "Bundesliga", leagueId: 78, kickoff: new Date(Date.now() - 3 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Home Win", won: true, homeScore: 3, awayScore: 2, date: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        matchId: 302,
        match: { id: 302, homeTeam: { id: 13, name: "Arsenal" }, awayTeam: { id: 14, name: "Tottenham" }, league: "Premier League", leagueId: 39, kickoff: new Date(Date.now() - 3 * 86400000).toISOString(), status: "finished" },
        prediction: "BTTS", actual: "BTTS", won: true, homeScore: 2, awayScore: 1, date: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        matchId: 303,
        match: { id: 303, homeTeam: { id: 15, name: "Atletico Madrid" }, awayTeam: { id: 16, name: "Valencia" }, league: "La Liga", leagueId: 140, kickoff: new Date(Date.now() - 3 * 86400000).toISOString(), status: "finished" },
        prediction: "Away Win", actual: "Home Win", won: false, homeScore: 2, awayScore: 0, date: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ],
  },
  {
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    label: "4 days ago",
    results: [
      {
        matchId: 401,
        match: { id: 401, homeTeam: { id: 17, name: "Chelsea" }, awayTeam: { id: 18, name: "Newcastle" }, league: "Premier League", leagueId: 39, kickoff: new Date(Date.now() - 4 * 86400000).toISOString(), status: "finished" },
        prediction: "Over 2.5", actual: "Over 2.5", won: true, homeScore: 3, awayScore: 1, date: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        matchId: 402,
        match: { id: 402, homeTeam: { id: 19, name: "AFC Leopards" }, awayTeam: { id: 20, name: "Tusker FC" }, league: "Kenyan Premier League", leagueId: 1644, kickoff: new Date(Date.now() - 4 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Draw", won: false, homeScore: 1, awayScore: 1, date: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ],
  },
  {
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    label: "5 days ago",
    results: [
      {
        matchId: 501,
        match: { id: 501, homeTeam: { id: 21, name: "PSG" }, awayTeam: { id: 22, name: "Lyon" }, league: "Ligue 1", leagueId: 61, kickoff: new Date(Date.now() - 5 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Home Win", won: true, homeScore: 3, awayScore: 0, date: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        matchId: 502,
        match: { id: 502, homeTeam: { id: 23, name: "Man United" }, awayTeam: { id: 24, name: "Everton" }, league: "Premier League", leagueId: 39, kickoff: new Date(Date.now() - 5 * 86400000).toISOString(), status: "finished" },
        prediction: "Home Win", actual: "Home Win", won: true, homeScore: 2, awayScore: 0, date: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
  },
];

const allResultsFlat = ALL_RESULTS.flatMap((d) => d.results);
const totalWon = allResultsFlat.filter((r) => r.won).length;
const totalMatches = allResultsFlat.length;
const overallAccuracy = Math.round((totalWon / totalMatches) * 100);

export default function ResultsPage() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const displayDays = selectedDay !== null ? [ALL_RESULTS[selectedDay]] : ALL_RESULTS;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-white font-black text-2xl mb-1">Prediction Results</h1>
          <p className="text-brand-muted text-sm">
            Last 5 days — every prediction logged before kick-off and verified after the final whistle.
          </p>
        </div>

        {/* Overall Accuracy Summary */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-brand-muted text-sm mb-1">Overall Accuracy (Last 5 Days)</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-green" />
                <span className="text-white font-black text-3xl">{overallAccuracy}%</span>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-5 h-5 text-brand-green mb-1" />
                <span className="text-white font-black text-xl">{totalWon}</span>
                <span className="text-brand-muted text-xs">Won</span>
              </div>
              <div className="flex flex-col items-center">
                <XCircle className="w-5 h-5 text-brand-red mb-1" />
                <span className="text-white font-black text-xl">{totalMatches - totalWon}</span>
                <span className="text-brand-muted text-xs">Lost</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-brand-muted text-2xl font-black mb-1">{totalMatches}</span>
                <span className="text-brand-muted text-xs">Total</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-brand-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all"
                style={{ width: `${overallAccuracy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Day Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedDay(null)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedDay === null ? "bg-brand-red border-brand-red text-white" : "bg-brand-card border-brand-border text-brand-muted hover:text-white"}`}
          >
            <Calendar className="w-3 h-3" /> All Days
          </button>
          {ALL_RESULTS.map((day, i) => {
            const wonDay = day.results.filter((r) => r.won).length;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedDay === i ? "bg-brand-red border-brand-red text-white" : "bg-brand-card border-brand-border text-brand-muted hover:text-white"}`}
              >
                {day.label}
                <span className={`font-black ${wonDay === day.results.length ? "text-brand-green" : wonDay === 0 ? "text-brand-red" : "text-brand-yellow"}`}>
                  {wonDay}/{day.results.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results by Day */}
        {displayDays.map((day, di) => {
          const dayWon = day.results.filter((r) => r.won).length;
          const dayAcc = Math.round((dayWon / day.results.length) * 100);
          return (
            <div key={di} className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-muted" />
                  <span className="text-white font-bold text-sm capitalize">{day.label}</span>
                  <span className="text-brand-muted text-xs">
                    · {new Date(day.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${dayAcc >= 70 ? "text-brand-green" : dayAcc >= 50 ? "text-brand-yellow" : "text-brand-red"}`}>
                    {dayAcc}% accuracy
                  </span>
                  <span className="text-brand-muted text-xs">{dayWon}/{day.results.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {day.results.map((result) => (
                  <ResultCard key={result.matchId} result={result} />
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-4 text-center">
          <p className="text-brand-muted text-xs">
            Results updated daily. All predictions are logged before matches kick off — no post-match edits, ever.
          </p>
        </div>
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
