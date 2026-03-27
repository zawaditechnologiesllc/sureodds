"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import ResultCard from "@/components/matches/ResultCard";
import { CheckCircle, XCircle, TrendingUp, Calendar, Loader2, AlertCircle } from "lucide-react";
import type { PredictionResult } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api-proxy";

function getPastDates(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    return d.toISOString().split("T")[0];
  });
}

function formatDayLabel(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(dateStr);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

interface DayResults {
  date: string;
  label: string;
  results: PredictionResult[];
  accuracy: number;
  won: number;
}

export default function ResultsPage() {
  const [days, setDays] = useState<DayResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const dates = getPastDates(14);
        const fetches = dates.map((d) =>
          fetch(`${API_URL}/results?date=${d}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        );
        const responses = await Promise.all(fetches);

        const daysData: DayResults[] = responses
          .map((res, i) => ({
            date: dates[i],
            label: formatDayLabel(dates[i]),
            results: (res?.results ?? []) as PredictionResult[],
            accuracy: res?.accuracy ?? 0,
            won: res?.won ?? 0,
          }))
          .filter((d) => d.results.length > 0);

        setDays(daysData);
      } catch {
        setError("Could not load results. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allResults = days.flatMap((d) => d.results);
  const totalWon = allResults.filter((r) => r.won).length;
  const totalMatches = allResults.length;
  const overallAccuracy = totalMatches > 0 ? Math.round((totalWon / totalMatches) * 100) : 0;

  const displayDays = selectedDay !== null ? [days[selectedDay]] : days;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-white font-black text-2xl mb-1">Prediction Results</h1>
          <p className="text-brand-muted text-sm">
            Every prediction logged before kick-off and verified after the final whistle.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-950 border border-red-900 rounded-xl p-6 flex items-center gap-3 text-brand-red">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Overall Accuracy Summary */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-brand-muted text-sm mb-1">Overall Accuracy (Last 14 Days)</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-green" />
                    <span className="text-white font-black text-3xl">
                      {totalMatches > 0 ? `${overallAccuracy}%` : "—"}
                    </span>
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
              {totalMatches > 0 && (
                <div className="mt-4">
                  <div className="h-2 bg-brand-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-green rounded-full transition-all"
                      style={{ width: `${overallAccuracy}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {days.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-brand-border mx-auto mb-4" />
                <p className="text-white font-bold text-lg mb-1">No results yet</p>
                <p className="text-brand-muted text-sm max-w-xs mx-auto">
                  Results appear here after matches finish. Our engine runs daily and updates scores automatically.
                </p>
              </div>
            ) : (
              <>
                {/* Day Filter */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedDay === null ? "bg-brand-red border-brand-red text-white" : "bg-brand-card border-brand-border text-brand-muted hover:text-white"}`}
                  >
                    <Calendar className="w-3 h-3" /> All Days
                  </button>
                  {days.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(i)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedDay === i ? "bg-brand-red border-brand-red text-white" : "bg-brand-card border-brand-border text-brand-muted hover:text-white"}`}
                    >
                      {day.label}
                      <span className={`font-black ${day.won === day.results.length ? "text-brand-green" : day.won === 0 ? "text-brand-red" : "text-brand-yellow"}`}>
                        {day.won}/{day.results.length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Results by Day */}
                {displayDays.map((day, di) => {
                  const dayAcc = Math.round((day.won / day.results.length) * 100);
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
                          <span className="text-brand-muted text-xs">{day.won}/{day.results.length}</span>
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
              </>
            )}

            <div className="mt-4 text-center">
              <p className="text-brand-muted text-xs">
                Results updated daily. All predictions logged before kick-off — no post-match edits, ever.
              </p>
            </div>
          </>
        )}
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
