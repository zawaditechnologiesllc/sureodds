"use client";

import { X, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { PredictionSlipItem } from "@/types";
import { cn } from "@/lib/utils";

interface PredictionSlipProps {
  items: PredictionSlipItem[];
  onRemove: (matchId: number) => void;
  onClear: () => void;
}

export default function PredictionSlip({ items, onRemove, onClear }: PredictionSlipProps) {
  const avgConfidence =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.confidence, 0) / items.length)
      : 0;

  return (
    <aside className="hidden xl:block w-64 flex-shrink-0">
      <div className="sticky top-20">
        <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-red">
            <span className="text-white font-black text-sm uppercase tracking-wide">
              Prediction Slip
            </span>
            <span className="text-white text-xs bg-white/20 rounded-full px-2 py-0.5 font-bold">
              {items.length}
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-brand-border">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-brand-muted text-sm">
                  Click a prediction to add it to your slip
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.matchId} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate">
                        {item.homeTeam} vs {item.awayTeam}
                      </p>
                      <p className="text-brand-red text-xs font-bold mt-0.5">{item.pick}</p>
                      <p className="text-brand-muted text-[10px] mt-0.5">
                        Confidence: {item.confidence}%
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.matchId)}
                      className="text-brand-muted hover:text-white shrink-0 mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="border-t border-brand-border px-4 py-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-brand-muted text-xs">Avg Confidence</span>
                <span
                  className={cn(
                    "font-bold text-sm",
                    avgConfidence >= 60
                      ? "text-brand-green"
                      : avgConfidence >= 40
                      ? "text-brand-yellow"
                      : "text-brand-orange"
                  )}
                >
                  {avgConfidence}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-muted text-xs">Selections</span>
                <span className="text-white font-bold text-sm">{items.length}</span>
              </div>
              <button
                onClick={onClear}
                className="w-full text-xs text-brand-muted hover:text-white transition-colors py-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Upgrade CTA for free users */}
        <div className="mt-3 bg-gradient-to-br from-red-950 to-brand-card border border-red-900 rounded-lg p-4">
          <p className="text-white font-bold text-sm mb-1">Unlock All Predictions</p>
          <p className="text-gray-400 text-xs mb-3">
            Get full access to all confidence levels and picks
          </p>
          <Link
            href="/auth/signup"
            className="block w-full bg-brand-red hover:bg-red-700 text-white text-xs font-bold py-2 rounded text-center transition-colors"
          >
            Get Started — Free Trial
          </Link>
        </div>
      </div>
    </aside>
  );
}
