"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Lock,
  Unlock,
  Flame,
  Shield,
  TrendingUp,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  ShoppingCart,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBundles, purchaseBundle, verifyBundlePayment } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import toast from "react-hot-toast";
import Link from "next/link";

interface BundlePick {
  fixture_id: number;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  market: string;
  market_label: string;
  odds: number;
  probability: number;
}

interface Bundle {
  id: string;
  name: string;
  total_odds: number;
  tier: string;
  price: number;
  current_price: number;
  played_count: number;
  remaining_count: number;
  currency: string;
  pick_count: number;
  is_active: boolean;
  expires_at: string | null;
  picks: BundlePick[] | null;
  purchased: boolean;
}

const TIER_META: Record<string, { color: string; bg: string; border: string; badge: string; icon: React.ElementType; desc: string; oddsRange: string; usdPrice: number }> = {
  safe: {
    color: "text-brand-green",
    bg: "bg-green-950/30",
    border: "border-green-900/50",
    badge: "bg-green-950 text-brand-green border-green-900",
    icon: Shield,
    desc: "Low-risk bundle for consistent daily value. Perfect for trust-building.",
    oddsRange: "5–10x",
    usdPrice: 10,
  },
  medium: {
    color: "text-blue-400",
    bg: "bg-blue-950/30",
    border: "border-blue-900/50",
    badge: "bg-blue-950 text-blue-400 border-blue-900",
    icon: TrendingUp,
    desc: "Balanced bundle for daily bettors seeking solid returns.",
    oddsRange: "20–50x",
    usdPrice: 20,
  },
  high: {
    color: "text-brand-yellow",
    bg: "bg-yellow-950/30",
    border: "border-yellow-900/50",
    badge: "bg-yellow-950 text-brand-yellow border-yellow-900",
    icon: Zap,
    desc: "High-odds bundle with great upside. For the experienced bettor.",
    oddsRange: "100–300x",
    usdPrice: 30,
  },
  mega: {
    color: "text-brand-red",
    bg: "bg-red-950/30",
    border: "border-red-900/50",
    badge: "bg-red-950 text-brand-red border-red-900",
    icon: Flame,
    desc: "Maximum excitement. Viral-level odds for the bold.",
    oddsRange: "500–1000x",
    usdPrice: 50,
  },
};

const MARKET_LABELS: Record<string, string> = {
  "1": "Home Win",
  "X": "Draw",
  "2": "Away Win",
  "over25": "Over 2.5 Goals",
  "btts": "Both Teams Score",
};

function formatKickoff(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    }) + " UTC";
  } catch {
    return iso;
  }
}

const USD_TO_KES = 130;

function PricingDisplay({ bundle }: { bundle: Bundle }) {
  const priceReduced = bundle.played_count > 0 && bundle.remaining_count > 0;
  const allPlayed = bundle.remaining_count === 0 && bundle.pick_count > 0;
  const meta = TIER_META[bundle.tier] ?? TIER_META.medium;

  if (allPlayed) {
    return (
      <div className="text-right">
        <div className="text-brand-muted text-lg font-black line-through">
          ${bundle.price.toFixed(2)}
        </div>
        <div className="text-brand-muted text-xs">All games played</div>
      </div>
    );
  }

  if (priceReduced) {
    return (
      <div className="text-right">
        <div className="text-brand-muted text-sm font-bold line-through">
          ${bundle.price.toFixed(2)}
        </div>
        <div className={cn("text-xl font-black", meta.color)}>
          ${bundle.current_price.toFixed(2)}
        </div>
        <div className="text-[10px] text-brand-muted">≈ KSh {Math.round(bundle.current_price * USD_TO_KES).toLocaleString()} · {bundle.remaining_count} left</div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className={cn("text-xl font-black", meta.color)}>
        ${bundle.price.toFixed(2)}
      </div>
      <div className="text-brand-muted text-[10px]">≈ KSh {Math.round(bundle.price * USD_TO_KES).toLocaleString()} · {bundle.pick_count} picks</div>
    </div>
  );
}

function AvailabilityBadge({ bundle }: { bundle: Bundle }) {
  if (bundle.purchased) return null;

  const allPlayed = bundle.remaining_count === 0 && bundle.pick_count > 0;

  if (allPlayed) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border bg-brand-card text-brand-muted border-brand-border uppercase">
        <Clock className="w-3 h-3" /> Closed
      </span>
    );
  }

  if (!bundle.is_active) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border bg-yellow-950 text-yellow-400 border-yellow-900 uppercase">
        <Ban className="w-3 h-3" /> Not Available
      </span>
    );
  }

  if (bundle.played_count > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border bg-blue-950 text-blue-400 border-blue-900 uppercase">
        <TrendingDown className="w-3 h-3" /> Price Reduced
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border bg-green-950 text-brand-green border-green-900 uppercase">
      <ShoppingCart className="w-3 h-3" /> Available
    </span>
  );
}

function BundleCard({ bundle, onPurchase, purchasing }: {
  bundle: Bundle;
  onPurchase: (id: string) => void;
  purchasing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TIER_META[bundle.tier] ?? TIER_META.medium;
  const Icon = meta.icon;

  const expiresAt = bundle.expires_at ? new Date(bundle.expires_at) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;
  const allPlayed = bundle.remaining_count === 0 && bundle.pick_count > 0;
  const priceReduced = bundle.played_count > 0 && bundle.remaining_count > 0;
  const canPurchase = bundle.is_active && !isExpired && !allPlayed && !bundle.purchased;

  return (
    <div className={cn(
      "rounded-2xl border p-5 transition-all",
      meta.bg, meta.border,
      !bundle.is_active && !bundle.purchased && "opacity-75"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", meta.bg, "border", meta.border)}>
            <Icon className={cn("w-5 h-5", meta.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border uppercase", meta.badge)}>
                {bundle.tier}
              </span>
              <AvailabilityBadge bundle={bundle} />
            </div>
            <h3 className="text-white font-black text-base mt-1">{bundle.name}</h3>
          </div>
        </div>
        <PricingDisplay bundle={bundle} />
      </div>

      {/* Odds + pick summary */}
      <div className="flex items-center flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1.5 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5">
          <span className={cn("text-lg font-black", meta.color)}>{bundle.total_odds}x</span>
          <span className="text-brand-muted text-xs">total odds</span>
        </div>
        <div className="flex items-center gap-1.5 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5">
          <span className={cn("text-xs font-black", meta.color)}>{meta.oddsRange}</span>
          <span className="text-brand-muted text-xs">target range</span>
        </div>
        <div className="flex items-center gap-1.5 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5">
          <span className="text-white text-sm font-bold">{bundle.pick_count}</span>
          <span className="text-brand-muted text-xs">picks</span>
        </div>
        {bundle.played_count > 0 && (
          <div className="flex items-center gap-1.5 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5">
            <span className="text-brand-muted text-sm font-bold">{bundle.played_count}</span>
            <span className="text-brand-muted text-xs">played</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-brand-muted text-xs mb-4">{meta.desc}</p>

      {/* Price reduced notice */}
      {priceReduced && (
        <div className="flex items-start gap-2 bg-blue-950/40 border border-blue-900/40 rounded-lg p-3 mb-4">
          <TrendingDown className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-300 text-xs leading-relaxed">
            <strong>{bundle.played_count} game{bundle.played_count !== 1 ? "s" : ""} already kicked off</strong> — price reduced to reflect the <strong>{bundle.remaining_count} remaining picks</strong>.
          </p>
        </div>
      )}

      {/* Expiry */}
      {expiresAt && (
        <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-4">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {isExpired ? (
            <span className="text-brand-red">Expired</span>
          ) : (
            <span>Expires {formatKickoff(bundle.expires_at!)}</span>
          )}
        </div>
      )}

      {/* Picks — locked or revealed */}
      {bundle.purchased && bundle.picks ? (
        <div className="mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-brand-green mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5" /> Picks Unlocked ({bundle.pick_count})
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="space-y-2">
              {bundle.picks.map((pick) => {
                const kicked = new Date(pick.kickoff) < new Date();
                return (
                  <div
                    key={pick.fixture_id}
                    className={cn(
                      "border rounded-lg px-3 py-2.5",
                      kicked ? "bg-brand-dark/60 border-brand-border/50 opacity-70" : "bg-brand-dark border-brand-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-brand-muted text-[10px]">{pick.league}</span>
                      <div className="flex items-center gap-2">
                        {kicked && <span className="text-[9px] text-brand-muted border border-brand-border rounded px-1">played</span>}
                        <span className="text-brand-green text-[10px] font-bold">{pick.odds}x</span>
                      </div>
                    </div>
                    <p className="text-white text-sm font-bold">
                      {pick.home_team} <span className="text-brand-muted font-normal">vs</span> {pick.away_team}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-brand-yellow text-xs font-bold">
                        → {MARKET_LABELS[pick.market] ?? pick.market_label}
                      </span>
                      <span className="text-brand-muted text-[10px]">{pick.probability}% confidence</span>
                    </div>
                    <div className="text-brand-muted text-[10px] mt-0.5">{formatKickoff(pick.kickoff)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : !bundle.purchased && (
        <div className="bg-brand-dark border border-brand-border rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-brand-muted" />
            <span className="text-brand-muted text-xs font-bold">
              {bundle.pick_count} picks hidden until purchase
            </span>
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: Math.min(bundle.pick_count, 3) }).map((_, i) => (
              <div key={i} className="h-2 bg-brand-border rounded blur-[1px] opacity-60" style={{ width: `${60 + i * 12}%` }} />
            ))}
            {bundle.pick_count > 3 && (
              <span className="text-brand-muted text-[10px]">+ {bundle.pick_count - 3} more picks...</span>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      {bundle.purchased ? (
        <div className="flex items-center justify-center gap-2 bg-green-950/50 border border-green-900/50 rounded-xl py-3 text-brand-green text-sm font-bold">
          <CheckCircle className="w-4 h-4" />
          Purchased — Picks Revealed
        </div>
      ) : isExpired || allPlayed ? (
        <div className="flex items-center justify-center gap-2 bg-brand-card border border-brand-border rounded-xl py-3 text-brand-muted text-sm">
          {allPlayed ? "All games have kicked off" : "Bundle expired"}
        </div>
      ) : !bundle.is_active ? (
        <div className="flex items-center justify-center gap-2 bg-yellow-950/30 border border-yellow-900/40 rounded-xl py-3 text-yellow-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Not available for purchase yet
        </div>
      ) : (
        <button
          onClick={() => onPurchase(bundle.id)}
          disabled={purchasing}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white font-black text-sm transition-all",
            "bg-brand-red hover:bg-red-700 disabled:opacity-60"
          )}
        >
          {purchasing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Unlock — ${bundle.current_price.toFixed(2)} <span className="text-[11px] opacity-70">(≈ KSh {Math.round(bundle.current_price * USD_TO_KES).toLocaleString()})</span>
              {priceReduced && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">REDUCED</span>
              )}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function BundlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchBundles();
      setBundles(data);
    } catch {
      toast.error("Could not load bundles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle return from Paystack
  useEffect(() => {
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref && isAuthenticated) {
      setVerifying(true);
      verifyBundlePayment(ref)
        .then(() => {
          toast.success("Payment confirmed! Your picks are now unlocked.");
          load();
          const url = new URL(window.location.href);
          url.searchParams.delete("reference");
          url.searchParams.delete("trxref");
          window.history.replaceState({}, "", url.toString());
        })
        .catch(() => {
          toast.error("Payment verification failed. Contact support if funds were deducted.");
        })
        .finally(() => setVerifying(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated]);

  const handlePurchase = async (bundleId: string) => {
    if (!isAuthenticated || !user?.email) {
      router.push("/auth/login?redirect=/bundles");
      return;
    }

    setPurchasingId(bundleId);
    try {
      const callbackUrl = `${window.location.origin}/bundles`;
      const data = await purchaseBundle(bundleId, user.email, callbackUrl);
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      toast.error(msg || "Could not start payment. Please try again.");
      setPurchasingId(null);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">Confirming your payment...</p>
          <p className="text-brand-muted text-sm mt-2">Please wait, do not close this page.</p>
        </div>
      </div>
    );
  }

  const tierOrder = ["safe", "medium", "high", "mega"];
  const sorted = [...bundles].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  const availableCount = bundles.filter((b) => b.is_active && !b.purchased).length;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-950 border border-red-900 text-brand-red text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <Flame className="w-3.5 h-3.5 fill-current" />
            Today&apos;s Bundles
          </div>
          <h1 className="text-white font-black text-4xl mb-3">
            Betting Intelligence
            <br />
            <span className="text-brand-red">Built to Win</span>
          </h1>
          <p className="text-brand-muted text-base max-w-lg mx-auto">
            Our AI assembles probability-weighted combos from high-confidence predictions.
            Pick a tier, pay once, get all the picks — no subscription needed.
          </p>
          {!loading && availableCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-950/40 border border-green-900/40 rounded-full px-4 py-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
              <span className="text-brand-green text-xs font-bold">{availableCount} bundle{availableCount !== 1 ? "s" : ""} available for purchase</span>
            </div>
          )}
        </div>

        {/* Tier legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-10">
          {tierOrder.map((tier) => {
            const m = TIER_META[tier];
            const Icon = m.icon;
            return (
              <div key={tier} className={cn("rounded-xl border p-3 text-center", m.bg, m.border)}>
                <Icon className={cn("w-5 h-5 mx-auto mb-1", m.color)} />
                <p className={cn("text-xs font-black uppercase", m.color)}>{tier}</p>
                <p className="text-brand-muted text-[10px] mt-0.5">
                  {tier === "safe" ? "5–10x" : tier === "medium" ? "20–50x" : tier === "high" ? "100–300x" : "500–1000x"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bundle cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
            <Star className="w-12 h-12 text-brand-muted mx-auto mb-4" />
            <h3 className="text-white font-black text-lg mb-2">No bundles available yet</h3>
            <p className="text-brand-muted text-sm mb-4">
              Bundles are generated daily by our team. Check back soon.
            </p>
            <Link href="/predictions" className="text-brand-red text-sm font-bold hover:text-red-400">
              Browse free fixtures instead →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sorted.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                onPurchase={handlePurchase}
                purchasing={purchasingId === bundle.id}
              />
            ))}
          </div>
        )}

        {/* How it works */}
        <div className="mt-14 bg-brand-card border border-brand-border rounded-2xl p-6">
          <h3 className="text-white font-black text-lg mb-5">How Bundles Work</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: "01", title: "We analyze", desc: "Our AI scans today's fixtures for high-confidence picks across all markets." },
              { n: "02", title: "We bundle", desc: "Picks are assembled into probability-weighted combos targeting specific odds tiers." },
              { n: "03", title: "You buy", desc: "Pay once per bundle. No subscription. Price drops as games kick off — you only pay for what's left." },
              { n: "04", title: "Picks revealed", desc: "Instantly see all match picks, markets, and individual odds after payment." },
            ].map(({ n, title, desc }) => (
              <div key={n}>
                <div className="text-brand-red font-black text-3xl font-mono mb-2">{n}</div>
                <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
                <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-brand-muted text-xs text-center mt-8 max-w-lg mx-auto">
          Sports predictions are never guaranteed. Sure Odds uses AI and historical data to calculate
          probabilities. Always bet responsibly and within your means.
        </p>
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}

export default function BundlesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
      }
    >
      <BundlesContent />
    </Suspense>
  );
}
