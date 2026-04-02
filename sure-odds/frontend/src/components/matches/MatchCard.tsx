"use client";

import { useState } from "react";
import { Lock, TrendingUp, Loader2, Zap, Sparkles } from "lucide-react";
import { cn, formatTime, getOddsFromProbability } from "@/lib/utils";
import type { Prediction, PredictionSlipItem } from "@/types";

interface MatchCardProps {
  prediction: Prediction;
  onAddToSlip?: (item: PredictionSlipItem) => void;
  selectedPick?: string;
  onUnlockClick?: () => void;
  isUnlocking?: boolean;
  hasCredits?: boolean;
}

function shortName(name: string, max = 11): string {
  return name.length > max ? name.split(" ")[0] : name;
}

function getBestLabel(prediction: Prediction): string {
  const { bestPick, match } = prediction;
  if (bestPick === "1") return `${match.homeTeam.name} Win`;
  if (bestPick === "X") return "Draw";
  if (bestPick === "2") return `${match.awayTeam.name} Win`;
  if (bestPick === "over25") return "Over 2.5 Goals";
  if (bestPick === "btts") return "Both Teams to Score";
  return "—";
}

function getBestPct(prediction: Prediction): number {
  const { bestPick } = prediction;
  if (bestPick === "1") return prediction.homeWinPct;
  if (bestPick === "X") return prediction.drawPct;
  if (bestPick === "2") return prediction.awayWinPct;
  if (bestPick === "over25") return prediction.over25Pct;
  if (bestPick === "btts") return prediction.bttsPct;
  return 0;
}

export default function MatchCard({ prediction, onAddToSlip, selectedPick, onUnlockClick, isUnlocking, hasCredits }: MatchCardProps) {
  const [localPick, setLocalPick] = useState<string | null>(selectedPick ?? prediction.bestPick);
  const { match } = prediction;

  const handlePick = (pick: string) => {
    if (prediction.locked) return;
    setLocalPick(pick);
    const pct =
      pick === "1" ? prediction.homeWinPct
      : pick === "X" ? prediction.drawPct
      : pick === "2" ? prediction.awayWinPct
      : pick === "over25" ? prediction.over25Pct
      : prediction.bttsPct;
    onAddToSlip?.({
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      pick: PICK_LABELS[pick] || pick,
      confidence: pct,
    });
  };

  const PICK_LABELS: Record<string, string> = {
    "1": `${match.homeTeam.name} Win`,
    X: "Draw",
    "2": `${match.awayTeam.name} Win`,
    over25: "Over 2.5",
    btts: "BTTS",
  };

  const bestLabel = getBestLabel(prediction);
  const bestPct = getBestPct(prediction);

  const confidenceMeta = {
    high_confidence: { bar: "bg-green-500",   text: "text-brand-green", badge: "bg-green-950 border-green-900 text-brand-green", label: "STRONG PICK" },
    high:            { bar: "bg-green-400",   text: "text-brand-green", badge: "bg-green-950 border-green-900 text-brand-green", label: "GOOD PICK"   },
    medium:          { bar: "bg-yellow-500",  text: "text-brand-yellow",badge: "bg-yellow-950 border-yellow-900 text-brand-yellow", label: "FAIR PICK" },
    low:             { bar: "bg-orange-500",  text: "text-brand-orange",badge: "bg-orange-950 border-orange-900 text-brand-orange", label: "RISKY"    },
    computing:       { bar: "bg-gray-600",    text: "text-gray-400",    badge: "bg-gray-800 border-gray-700 text-gray-400",         label: "COMPUTING" },
  };
  const meta = confidenceMeta[prediction.confidence] ?? confidenceMeta.computing;

  const buttons = [
    { key: "1", subLabel: shortName(match.homeTeam.name), pct: prediction.homeWinPct },
    { key: "X", subLabel: "Draw",                          pct: prediction.drawPct },
    { key: "2", subLabel: shortName(match.awayTeam.name),  pct: prediction.awayWinPct },
  ];

  return (
    <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden hover:border-gray-600 transition-colors">

      {/* Top bar: league + time + badge */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">{match.league}</span>
          <span className="text-brand-border">·</span>
          <span className="text-xs text-brand-muted font-medium">{formatTime(match.kickoff)}</span>
        </div>
        {!prediction.computing && (
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", meta.badge)}>
            {meta.label}
          </span>
        )}
        {prediction.computing && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 animate-pulse">
            COMPUTING
          </span>
        )}
      </div>

      {/* Our Pick recommendation banner */}
      {!prediction.locked && !prediction.computing && (
        <div className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-brand-border",
          prediction.confidence === "high_confidence" || prediction.confidence === "high"
            ? "bg-green-950/30"
            : prediction.confidence === "medium"
            ? "bg-yellow-950/20"
            : "bg-orange-950/20"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className={cn("w-3.5 h-3.5 shrink-0", meta.text)} />
            <span className="text-[10px] text-brand-muted font-semibold uppercase tracking-wide shrink-0">Bet On</span>
            <span className="text-white font-black text-sm truncate">{bestLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Probability bar */}
            <div className="w-16 h-1.5 bg-brand-border rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${bestPct}%` }} />
            </div>
            <span className={cn("text-sm font-black tabular-nums", meta.text)}>{bestPct}%</span>
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">{match.homeTeam.name}</span>
            <span className="text-brand-muted text-xs my-0.5">vs</span>
            <span className="text-white font-bold text-sm">{match.awayTeam.name}</span>
          </div>
          {prediction.locked ? (
            <button
              onClick={onUnlockClick}
              disabled={isUnlocking}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isUnlocking
                  ? "text-brand-red opacity-60"
                  : hasCredits
                  ? "text-brand-green hover:text-green-400"
                  : "text-brand-muted hover:text-brand-red"
              )}
            >
              {isUnlocking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : hasCredits ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              <span className="text-xs font-bold">
                {isUnlocking ? "..." : hasCredits ? "1 Credit" : "Unlock"}
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <TrendingUp className="w-4 h-4 text-brand-muted" />
              <span className="text-[10px] text-brand-muted text-right leading-tight max-w-[64px]">
                {prediction.locked ? "" : "Win probability"}
              </span>
            </div>
          )}
        </div>

        {/* Win probability buttons — 1 / X / 2 */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {buttons.map(({ key, subLabel, pct }) => (
            <button
              key={key}
              onClick={() => handlePick(key)}
              disabled={prediction.locked || prediction.computing}
              className={cn(
                "odds-btn relative",
                localPick === key && "selected",
                prediction.bestPick === key && localPick !== key && "best-pick",
                (prediction.locked || prediction.computing) && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="label">{subLabel}</span>
              <span className="value">
                {prediction.locked || prediction.computing
                  ? "?"
                  : getOddsFromProbability(pct)}
              </span>
              {!prediction.locked && !prediction.computing && (
                <span className={cn(
                  "text-[9px] font-bold tabular-nums mt-0.5",
                  localPick === key ? "text-red-200" : "text-brand-muted"
                )}>
                  {pct}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Additional Markets */}
        {!prediction.locked && !prediction.computing && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <button
              onClick={() => handlePick("over25")}
              className={cn(
                "odds-btn",
                localPick === "over25" && "selected",
                prediction.bestPick === "over25" && localPick !== "over25" && "best-pick"
              )}
            >
              <span className="label">Over 2.5</span>
              <span className="value">{getOddsFromProbability(prediction.over25Pct)}</span>
              <span className={cn("text-[9px] font-bold tabular-nums mt-0.5", localPick === "over25" ? "text-red-200" : "text-brand-muted")}>
                {prediction.over25Pct}%
              </span>
            </button>
            <button
              onClick={() => handlePick("btts")}
              className={cn(
                "odds-btn",
                localPick === "btts" && "selected",
                prediction.bestPick === "btts" && localPick !== "btts" && "best-pick"
              )}
            >
              <span className="label">BTTS</span>
              <span className="value">{getOddsFromProbability(prediction.bttsPct)}</span>
              <span className={cn("text-[9px] font-bold tabular-nums mt-0.5", localPick === "btts" ? "text-red-200" : "text-brand-muted")}>
                {prediction.bttsPct}%
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
