"use client";

import { cn } from "@/lib/utils";
import { LEAGUES } from "@/types";
import { Calendar, Flame, Radio } from "lucide-react";

interface SidebarProps {
  selectedLeague?: number | null;
  selectedFilter?: "today" | "tomorrow" | "live";
  onLeagueChange?: (id: number | null) => void;
  onFilterChange?: (filter: "today" | "tomorrow" | "live") => void;
}

export default function Sidebar({
  selectedLeague,
  selectedFilter = "today",
  onLeagueChange,
  onFilterChange,
}: SidebarProps) {
  return (
    <aside className="hidden lg:block w-56 flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Time Filters */}
        <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-brand-border">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">
              Filter
            </span>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={() => onFilterChange?.("today")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors text-left",
                selectedFilter === "today"
                  ? "bg-brand-red text-white"
                  : "text-gray-300 hover:bg-white/5"
              )}
            >
              <Flame className="w-4 h-4" />
              Today
            </button>
            <button
              onClick={() => onFilterChange?.("tomorrow")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors text-left",
                selectedFilter === "tomorrow"
                  ? "bg-brand-red text-white"
                  : "text-gray-300 hover:bg-white/5"
              )}
            >
              <Calendar className="w-4 h-4" />
              Tomorrow
            </button>
            <button
              onClick={() => onFilterChange?.("live")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors text-left",
                selectedFilter === "live"
                  ? "bg-brand-red text-white"
                  : "text-gray-300 hover:bg-white/5"
              )}
            >
              <Radio className="w-4 h-4" />
              Live
              <span className="ml-auto w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            </button>
          </div>
        </div>

        {/* League Filters */}
        <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-brand-border">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">
              Leagues
            </span>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={() => onLeagueChange?.(null)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors text-left",
                !selectedLeague
                  ? "bg-brand-red text-white"
                  : "text-gray-300 hover:bg-white/5"
              )}
            >
              ⚽ All Leagues
            </button>
            {LEAGUES.map((league) => (
              <button
                key={league.id}
                onClick={() => onLeagueChange?.(league.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors text-left",
                  selectedLeague === league.id
                    ? "bg-brand-red text-white"
                    : "text-gray-300 hover:bg-white/5"
                )}
              >
                <span className="text-xs text-brand-muted w-14 shrink-0">
                  {league.country}
                </span>
                {league.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
