"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import MatchCard from "@/components/matches/MatchCard";
import PredictionSlip from "@/components/matches/PredictionSlip";
import type { Prediction, PredictionSlipItem } from "@/types";

// Mock data for development — replace with API calls
const MOCK_PREDICTIONS: Prediction[] = [
  {
    matchId: 1,
    match: {
      id: 1,
      homeTeam: { id: 1, name: "Man City" },
      awayTeam: { id: 2, name: "Arsenal" },
      league: "Premier League",
      leagueId: 39,
      kickoff: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      status: "scheduled",
    },
    homeWinPct: 55,
    drawPct: 25,
    awayWinPct: 20,
    over25Pct: 72,
    bttsPct: 65,
    bestPick: "1",
    confidence: "high",
    locked: false,
  },
  {
    matchId: 2,
    match: {
      id: 2,
      homeTeam: { id: 3, name: "Liverpool" },
      awayTeam: { id: 4, name: "Chelsea" },
      league: "Premier League",
      leagueId: 39,
      kickoff: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      status: "scheduled",
    },
    homeWinPct: 48,
    drawPct: 27,
    awayWinPct: 25,
    over25Pct: 68,
    bttsPct: 58,
    bestPick: "1",
    confidence: "medium",
    locked: false,
  },
  {
    matchId: 3,
    match: {
      id: 3,
      homeTeam: { id: 5, name: "Real Madrid" },
      awayTeam: { id: 6, name: "Barcelona" },
      league: "La Liga",
      leagueId: 140,
      kickoff: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
      status: "scheduled",
    },
    homeWinPct: 42,
    drawPct: 28,
    awayWinPct: 30,
    over25Pct: 61,
    bttsPct: 55,
    bestPick: "1",
    confidence: "medium",
    locked: true,
  },
  {
    matchId: 4,
    match: {
      id: 4,
      homeTeam: { id: 7, name: "Gor Mahia" },
      awayTeam: { id: 8, name: "AFC Leopards" },
      league: "Kenyan Premier League",
      leagueId: 1644,
      kickoff: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
      status: "scheduled",
    },
    homeWinPct: 50,
    drawPct: 30,
    awayWinPct: 20,
    over25Pct: 45,
    bttsPct: 40,
    bestPick: "1",
    confidence: "low",
    locked: true,
  },
];

export default function PredictionsPage() {
  const [slipItems, setSlipItems] = useState<PredictionSlipItem[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [filter, setFilter] = useState<"today" | "tomorrow">("today");

  const filtered = MOCK_PREDICTIONS.filter(
    (p) => !selectedLeague || p.match.leagueId === selectedLeague
  );

  const handleAddToSlip = (item: PredictionSlipItem) => {
    setSlipItems((prev) => {
      const existing = prev.findIndex((i) => i.matchId === item.matchId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = item;
        return updated;
      }
      return [...prev, item];
    });
  };

  const handleRemove = (matchId: number) => {
    setSlipItems((prev) => prev.filter((i) => i.matchId !== matchId));
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        <Sidebar
          selectedLeague={selectedLeague}
          selectedFilter={filter}
          onLeagueChange={setSelectedLeague}
          onFilterChange={setFilter}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-white font-black text-xl">Today&apos;s Predictions</h1>
              <p className="text-brand-muted text-xs mt-0.5">
                {filtered.length} matches · Updated every 30 minutes
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((prediction) => (
              <MatchCard
                key={prediction.matchId}
                prediction={prediction}
                onAddToSlip={handleAddToSlip}
                selectedPick={slipItems.find((i) => i.matchId === prediction.matchId)?.pick}
              />
            ))}
          </div>
        </main>

        <PredictionSlip
          items={slipItems}
          onRemove={handleRemove}
          onClear={() => setSlipItems([])}
        />
      </div>

      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
