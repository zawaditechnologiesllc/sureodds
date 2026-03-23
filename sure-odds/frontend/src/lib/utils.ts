import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "high":
      return "text-brand-green";
    case "medium":
      return "text-brand-yellow";
    case "low":
      return "text-brand-orange";
    default:
      return "text-brand-muted";
  }
}

export function getOddsFromProbability(pct: number): string {
  if (pct <= 0) return "—";
  const decimal = 100 / pct;
  return decimal.toFixed(2);
}

export function getProbabilityColor(pct: number): string {
  if (pct >= 60) return "text-brand-green";
  if (pct >= 40) return "text-brand-yellow";
  return "text-brand-orange";
}
