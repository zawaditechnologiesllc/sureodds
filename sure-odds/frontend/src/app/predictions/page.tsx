"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import MatchCard from "@/components/matches/MatchCard";
import PredictionSlip from "@/components/matches/PredictionSlip";
import type { Prediction, PredictionSlipItem } from "@/types";
import { fetchPredictions } from "@/lib/api";
import { Loader2, AlertCircle, CalendarX } from "lucide-react";

function getDateStr(filter: "today" | "tomorrow"): string {
  const d = new Date();
  if (filter === "tomorrow") d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function PredictionsPage() {
  const [slipItems, setSlipItems] = useState<PredictionSlipItem[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [filter, setFilter] = useState<"today" | "tomorrow">("today");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = getDateStr(filter);
      const data = await fetchPredictions(dateStr, selectedLeague ?? undefined);
      setPredictions(data);
    } catch {
      setError("Could not load predictions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, selectedLeague]);

  useEffect(() => {
    load();
  }, [load]);

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

  const label = filter === "today" ? "Today's" : "Tomorrow's";

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        <Sidebar
          selectedLeague={selectedLeague}
          selectedFilter={filter}
          onLeagueChange={(id) => setSelectedLeague(id)}
          onFilterChange={setFilter}
        />

        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-white font-black text-xl">{label} Predictions</h1>
              <p className="text-brand-muted text-xs mt-0.5">
                {loading ? "Loading..." : `${predictions.length} matches · Updated daily`}
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-950 border border-red-900 rounded-xl p-6 flex items-center gap-3 text-brand-red">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Failed to load predictions</p>
                <p className="text-xs mt-0.5 text-red-400">{error}</p>
                <button
                  onClick={load}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && predictions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarX className="w-12 h-12 text-brand-border mb-4" />
              <p className="text-white font-bold text-lg mb-1">No matches scheduled</p>
              <p className="text-brand-muted text-sm max-w-sm">
                {filter === "today"
                  ? "No fixtures found for today. This may be an international break or a rest day for the tracked leagues. Try switching to Tomorrow or check back later."
                  : "No fixtures found for tomorrow yet. The schedule may not have been released, or there could be an international break. Check back later today."}
              </p>
            </div>
          )}

          {!loading && !error && predictions.length > 0 && (
            <div className="space-y-3">
              {predictions.map((prediction) => (
                <MatchCard
                  key={prediction.matchId}
                  prediction={prediction}
                  onAddToSlip={handleAddToSlip}
                  selectedPick={slipItems.find((i) => i.matchId === prediction.matchId)?.pick}
                />
              ))}
            </div>
          )}
        </main>

        <PredictionSlip
          items={slipItems}
          onRemove={handleRemove}
          onClear={() => setSlipItems([])}
        />
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
