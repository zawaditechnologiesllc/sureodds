"use client";

import { useState } from "react";
import { Lock, Star, TrendingUp } from "lucide-react";
import { cn, formatTime, getOddsFromProbability, getProbabilityColor } from "@/lib/utils";
import type { Prediction, PredictionSlipItem } from "@/types";

interface MatchCardProps {
  prediction: Prediction;
  onAddToSlip?: (item: PredictionSlipItem) => void;
  selectedPick?: string;
}

const PICK_LABELS: Record<string, string> = {
  "1": "Home",
  X: "Draw",
  "2": "Away",
  over25: "Over 2.5",
  btts: "BTTS",
};

export default function MatchCard({ prediction, onAddToSlip, selectedPick }: MatchCardProps) {
  const [localPick, setLocalPick] = useState<string | null>(selectedPick || null);
  const { match } = prediction;

  const handlePick = (pick: string) => {
    if (prediction.locked) return;
    setLocalPick(pick);
    onAddToSlip?.({
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      pick: PICK_LABELS[pick] || pick,
      confidence: pick === "1" ? prediction.homeWinPct : pick === "X" ? prediction.drawPct : prediction.awayWinPct,
    });
  };

  const isBest = (pick: string) => prediction.bestPick === pick;

  const buttons = [
    { key: "1", label: "1", subLabel: "Home", pct: prediction.homeWinPct },
    { key: "X", label: "X", subLabel: "Draw", pct: prediction.drawPct },
    { key: "2", label: "2", subLabel: "Away", pct: prediction.awayWinPct },
  ];

  return (
    <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
      {/* Match Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">{match.league}</span>
          <span className="text-brand-border">·</span>
          <span className="text-xs text-brand-muted font-medium">{formatTime(match.kickoff)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {prediction.confidence === "high" && (
            <span className="flex items-center gap-1 bg-green-950 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-900">
              <Star className="w-2.5 h-2.5 fill-current" />
              BEST PICK
            </span>
          )}
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded",
              prediction.confidence === "high" && "bg-green-950 text-brand-green",
              prediction.confidence === "medium" && "bg-yellow-950 text-brand-yellow",
              prediction.confidence === "low" && "bg-orange-950 text-brand-orange"
            )}
          >
            {prediction.confidence === "high" ? "HIGH" : prediction.confidence === "medium" ? "MED" : "LOW"}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">{match.homeTeam.name}</span>
            <span className="text-brand-muted text-xs">vs</span>
            <span className="text-white font-bold text-sm">{match.awayTeam.name}</span>
          </div>
          {prediction.locked ? (
            <div className="flex flex-col items-center gap-1 text-brand-muted">
              <Lock className="w-5 h-5" />
              <span className="text-xs">Unlock</span>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
                <span className={cn("text-sm font-bold", getProbabilityColor(Math.max(prediction.homeWinPct, prediction.drawPct, prediction.awayWinPct)))}>
                  {Math.max(prediction.homeWinPct, prediction.drawPct, prediction.awayWinPct)}%
                </span>
              </div>
              <span className="text-[10px] text-brand-muted">Confidence</span>
            </div>
          )}
        </div>

        {/* Odds Buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {buttons.map(({ key, label, subLabel, pct }) => (
            <button
              key={key}
              onClick={() => handlePick(key)}
              disabled={prediction.locked}
              className={cn(
                "odds-btn relative",
                localPick === key && "selected",
                prediction.locked && "opacity-50 cursor-not-allowed blur-sm"
              )}
            >
              {isBest(key) && !prediction.locked && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full" />
              )}
              <span className="label">{subLabel}</span>
              <span className="value">
                {prediction.locked ? "?" : getOddsFromProbability(pct)}
              </span>
            </button>
          ))}
        </div>

        {/* Additional Markets */}
        {!prediction.locked && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <button
              onClick={() => handlePick("over25")}
              className={cn("odds-btn", localPick === "over25" && "selected")}
            >
              <span className="label">Over 2.5</span>
              <span className="value">{getOddsFromProbability(prediction.over25Pct)}</span>
            </button>
            <button
              onClick={() => handlePick("btts")}
              className={cn("odds-btn", localPick === "btts" && "selected")}
            >
              <span className="label">BTTS</span>
              <span className="value">{getOddsFromProbability(prediction.bttsPct)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
