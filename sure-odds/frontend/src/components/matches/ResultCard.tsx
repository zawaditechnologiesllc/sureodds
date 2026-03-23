import { CheckCircle, XCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { PredictionResult } from "@/types";

interface ResultCardProps {
  result: PredictionResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-lg p-3 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-brand-muted">{result.match.league}</span>
        <span className="text-xs text-brand-muted">{formatDate(result.date)}</span>
      </div>

      <div className="flex items-center justify-between">
        {/* Teams & Score */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-white font-bold text-sm">{result.match.homeTeam.name}</span>
            <span className="text-white font-black text-base tabular-nums">
              {result.homeScore} - {result.awayScore}
            </span>
            <span className="text-white font-bold text-sm">{result.match.awayTeam.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-brand-muted text-xs">Predicted:</span>
            <span className="text-white text-xs font-bold">{result.prediction}</span>
            <span className="text-brand-muted text-xs">→</span>
            <span className="text-brand-muted text-xs">Actual: {result.actual}</span>
          </div>
        </div>

        {/* Win/Loss */}
        <div
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded font-bold text-sm",
            result.won
              ? "bg-green-950 text-brand-green border border-green-900"
              : "bg-red-950 text-brand-red border border-red-900"
          )}
        >
          {result.won ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {result.won ? "WON" : "LOST"}
        </div>
      </div>
    </div>
  );
}
