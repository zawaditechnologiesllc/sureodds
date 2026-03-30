"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import MatchCard from "@/components/matches/MatchCard";
import PredictionSlip from "@/components/matches/PredictionSlip";
import type { Prediction, PredictionSlipItem } from "@/types";
import { fetchPredictions, fetchUserCredits, unlockPick } from "@/lib/api";
import { Loader2, AlertCircle, CalendarX, Lock, Zap, CreditCard, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

function getDateStr(filter: "today" | "tomorrow"): string {
  const d = new Date();
  if (filter === "tomorrow") d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function PredictionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [slipItems, setSlipItems] = useState<PredictionSlipItem[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [filter, setFilter] = useState<"today" | "tomorrow">("today");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState<number | null>(null);

  const lockedCount = predictions.filter((p) => p.locked).length;
  const unlockedCount = predictions.filter((p) => !p.locked).length;

  const refreshCredits = useCallback(() => {
    fetchUserCredits()
      .then((c) => setCredits(c.remaining_picks))
      .catch(() => null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = getDateStr(filter);
      const [data] = await Promise.all([
        fetchPredictions(dateStr, selectedLeague ?? undefined),
        fetchUserCredits().then((c) => setCredits(c.remaining_picks)).catch(() => null),
      ]);
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

  // Show success toast if returning from payment
  useEffect(() => {
    if (typeof window === "undefined") return;
    const paid = searchParams.get("credits");
    if (paid === "added") {
      refreshCredits();
      toast.success("Credits added! Tap any 🔒 pick to unlock it with 1 credit.", {
        duration: 6000,
        icon: "⚡",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("credits");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, refreshCredits]);

  const handleUnlock = useCallback(
    async (matchId: number) => {
      if (credits === null || credits <= 0) {
        router.push("/packages");
        return;
      }

      setUnlocking(matchId);
      try {
        const data = await unlockPick(matchId);
        // Update the prediction in state with the unlocked data
        setPredictions((prev) =>
          prev.map((p) =>
            p.matchId === matchId
              ? {
                  ...p,
                  locked: false,
                  homeWinPct: data.homeWinPct ?? p.homeWinPct,
                  drawPct: data.drawPct ?? p.drawPct,
                  awayWinPct: data.awayWinPct ?? p.awayWinPct,
                  over25Pct: data.over25Pct ?? p.over25Pct,
                  bttsPct: data.bttsPct ?? p.bttsPct,
                  bestPick: data.bestPick ?? p.bestPick,
                  confidence: data.confidence ?? p.confidence,
                }
              : p
          )
        );
        const remaining = data.creditsRemaining ?? (credits - 1);
        setCredits(remaining);
        toast.success(
          `Pick unlocked! ${remaining} credit${remaining !== 1 ? "s" : ""} remaining.`,
          { icon: "⚡" }
        );
      } catch (err: unknown) {
        const status =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { status?: number } }).response?.status
            : null;
        if (status === 402) {
          toast.error("No credits left. Buy more to unlock picks.");
          router.push("/packages");
        } else if (status === 401) {
          toast.error("Please log in to unlock picks.");
          router.push("/auth/login?redirect=/predictions");
        } else {
          toast.error("Could not unlock this pick. Please try again.");
        }
      } finally {
        setUnlocking(null);
      }
    },
    [credits, router]
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
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="min-w-0">
              <h1 className="text-white font-black text-xl">{label} Predictions</h1>
              <p className="text-brand-muted text-xs mt-0.5">
                {loading
                  ? "Loading matches..."
                  : `${predictions.length} matches · Updated daily`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {credits !== null && credits > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-green-950/40 border border-green-900/40 rounded-lg px-3 py-1.5">
                  <Zap className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-brand-green text-xs font-bold">
                    {credits} credit{credits !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="p-2 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-gray-500 transition-colors disabled:opacity-40"
                title="Refresh predictions"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Link
                href="/packages"
                className="hidden sm:flex items-center gap-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Add Credits
              </Link>
            </div>
          </div>

          {/* Skeleton loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg bg-brand-card border border-brand-border animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-950 border border-red-900 rounded-xl p-6 flex items-start gap-3 text-brand-red">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
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
                  ? "No fixtures found for today. This may be an international break. Try switching to Tomorrow."
                  : "No fixtures found for tomorrow yet. Check back later today."}
              </p>
              <button
                onClick={() => setFilter(filter === "today" ? "tomorrow" : "today")}
                className="mt-4 text-sm text-brand-red hover:text-red-400 font-bold transition-colors"
              >
                Switch to {filter === "today" ? "Tomorrow" : "Today"}
              </button>
            </div>
          )}

          {!loading && !error && predictions.length > 0 && (
            <>
              {/* Credits banner */}
              {credits !== null && credits > 0 && (
                <div className="mb-3 flex items-center gap-2 bg-green-950/20 border border-green-900/30 rounded-lg px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-brand-green shrink-0" />
                  <span className="text-brand-muted text-xs">
                    You have{" "}
                    <span className="text-white font-bold">{credits}</span>{" "}
                    pick {credits === 1 ? "credit" : "credits"} — tap the 🔒 lock on any pick to unlock it instantly.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {predictions.map((prediction) => (
                  <MatchCard
                    key={prediction.matchId}
                    prediction={prediction}
                    onAddToSlip={handleAddToSlip}
                    selectedPick={slipItems.find((i) => i.matchId === prediction.matchId)?.pick}
                    onUnlockClick={() => handleUnlock(prediction.matchId)}
                    isUnlocking={unlocking === prediction.matchId}
                    hasCredits={(credits ?? 0) > 0}
                  />
                ))}
              </div>

              {/* Paywall Banner */}
              {lockedCount > 0 && (
                <div className="mt-4 bg-gradient-to-r from-red-950 to-brand-card border border-brand-red/40 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-bold text-sm">
                        {lockedCount} more {lockedCount === 1 ? "pick" : "picks"} locked
                      </p>
                      <p className="text-brand-muted text-xs mt-0.5">
                        {credits !== null && credits > 0
                          ? `Use your ${credits} remaining ${credits === 1 ? "credit" : "credits"} — tap the 🔒 icon to unlock.`
                          : `You're seeing ${unlockedCount} free ${unlockedCount === 1 ? "pick" : "picks"}. Buy credits to unlock the rest.`}
                      </p>
                    </div>
                  </div>
                  {(!credits || credits === 0) && (
                    <Link
                      href="/packages"
                      className="shrink-0 flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Buy Credits
                    </Link>
                  )}
                </div>
              )}
            </>
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

export default function PredictionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
      }
    >
      <PredictionsContent />
    </Suspense>
  );
}
