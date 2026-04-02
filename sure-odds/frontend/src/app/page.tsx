import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  Lock,
  TrendingUp,
  Users,
  Zap,
  Shield,
  Star,
  CheckCircle,
  XCircle,
  ChevronDown,
  Brain,
  Database,
  Clock,
  Flame,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Our FastAPI prediction engine analyzes thousands of data points — form, injuries, head-to-head, home/away records — to generate probability estimates.",
  },
  {
    icon: Shield,
    title: "Verified Track Record",
    desc: "Every prediction is logged before kick-off and verified after. Our results page shows the full history — wins, losses, nothing hidden.",
  },
  {
    icon: Database,
    title: "Multiple Markets",
    desc: "Get predictions for 1X2, Over/Under 2.5, and Both Teams To Score — each with percentage probabilities and a best-pick recommendation.",
  },
  {
    icon: Clock,
    title: "Daily Updates",
    desc: "Predictions are updated 24 hours before kick-off and refreshed when team news breaks. You always get the freshest data.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Sign Up for Free",
    desc: "Create an account in 30 seconds. No credit card needed. You get 2 free predictions every day automatically.",
  },
  {
    num: "02",
    title: "Browse Predictions",
    desc: "See today's upcoming matches across the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and many more — with confidence ratings and probability breakdowns.",
  },
  {
    num: "03",
    title: "Unlock Picks or Buy a Bundle",
    desc: "Use pick credits to unlock individual matches, or grab a Bundle — our AI assembles a full combo (Safe, Medium, High, or Mega odds) ready to place.",
  },
  {
    num: "04",
    title: "Track Our Record",
    desc: "Check the Results page every day. We log every prediction before kick-off and update results after the final whistle. Nothing hidden.",
  },
];

const PRICING_PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Start browsing today's picks — no card needed.",
    features: [
      "2 free predictions per day",
      "Confidence badges (High / Medium / Low)",
      "Full results history access",
      "Community Telegram access",
    ],
    locked: ["Full probability breakdown", "Bundle access", "Pick credits"],
    cta: "Get Started Free",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Pick Credits",
    price: "From $2.99",
    period: "per pack",
    desc: "Unlock individual matches on demand. Credits never expire.",
    features: [
      "Full probability breakdown per pick",
      "1X2, Over 2.5 & BTTS markets",
      "High / Medium / Low confidence scores",
      "Credits never expire",
      "Choose exactly which matches to unlock",
    ],
    locked: [],
    cta: "Buy Credits",
    href: "/packages",
    highlight: false,
    badge: "",
  },
  {
    name: "Bundles",
    price: "$10–$50",
    period: "per bundle",
    desc: "AI-built betting combos. Pay once, all picks revealed.",
    features: [
      "4 tiers: Safe, Medium, High, Mega",
      "5x up to 1000x combined odds",
      "AI selects the best picks for each tier",
      "Full breakdown unlocked on purchase",
      "New bundles generated daily",
    ],
    locked: [],
    cta: "Browse Bundles",
    href: "/bundles",
    highlight: true,
    badge: "🔥 New",
  },
];

const FAQS = [
  {
    q: "Are these predictions guaranteed?",
    a: "No prediction in sports is ever guaranteed. Sure Odds uses AI and historical data to calculate probabilities — we give you better-informed picks, not certainties. Always bet responsibly.",
  },
  {
    q: "How are predictions generated?",
    a: "Our Python + FastAPI backend fetches live fixture data, then runs a model based on historical matches. It considers team form, head-to-head records, home/away performance, goal averages, and more.",
  },
  {
    q: "What is a Bundle and how does it work?",
    a: "A Bundle is a pre-built betting combo assembled by our AI. We select picks from today's highest-confidence predictions and multiply their odds to hit a target range (e.g. 5–10x for Safe, 500–1000x for Mega). Pay once and all picks in the bundle are revealed instantly.",
  },
  {
    q: "What are the Bundle tiers?",
    a: "There are 4 tiers: Safe Slip ($10, 5–10x odds), Medium Slip ($20, 20–50x), High Roller ($30, 100–300x), and Mega Slip ($50, 500–1000x). Higher tiers include more picks and chase bigger returns.",
  },
  {
    q: "What's the difference between Pick Credits and Bundles?",
    a: "Pick Credits let you unlock individual predictions one at a time — you choose which matches to unlock. Bundles are AI-built combos where you pay once and get a ready-to-place accumulator. Credits suit cherry-pickers; bundles suit combo bettors.",
  },
  {
    q: "What leagues do you cover?",
    a: "We cover the top European leagues — Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, and Primeira Liga — plus MLS, Saudi Pro League, and many more. Data is sourced from Sofascore.",
  },
  {
    q: "How do I join the affiliate program?",
    a: "Visit the Partner page and submit an application. Our team reviews applications based on your audience size and engagement. Approved partners earn 30% commission on every referred purchase.",
  },
  {
    q: "How are affiliate payouts processed?",
    a: "Affiliate commissions are paid monthly via bank transfer or USDT (TRC-20). The minimum payout threshold is $10.",
  },
];

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-green-950 text-brand-green border-green-900",
  medium: "bg-yellow-950 text-brand-yellow border-yellow-900",
  low: "bg-gray-900 text-gray-400 border-gray-700",
};

const PICK_LABELS: Record<string, string> = {
  "1": "Home Win",
  X: "Draw",
  "2": "Away Win",
  over25: "Over 2.5",
  btts: "BTTS",
};

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatPickDate(dateStr: string): string {
  const today = offsetDate(0);
  const tomorrow = offsetDate(1);
  if (dateStr === today) return "Today's Featured Picks";
  if (dateStr === tomorrow) return "Tomorrow's Featured Picks";
  const d = new Date(dateStr + "T00:00:00Z");
  return `Upcoming Picks — ${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}`;
}

async function getFeaturedPicks(): Promise<{ picks: any[]; dateLabel: string }> {
  for (let offset = 0; offset <= 7; offset++) {
    try {
      const dateStr = offsetDate(offset);
      const res = await fetch(`${API_URL}/predictions?date=${dateStr}`, {
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const picks = (data as any[]).slice(0, 4);
      if (picks.length > 0) {
        return { picks, dateLabel: formatPickDate(dateStr) };
      }
    } catch {
      continue;
    }
  }
  return { picks: [], dateLabel: "Featured Picks" };
}

async function getRecentResults() {
  for (let offset = 1; offset <= 7; offset++) {
    try {
      const dateStr = offsetDate(-offset);
      const res = await fetch(`${API_URL}/results?date=${dateStr}`, {
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.results?.length > 0) return data;
    } catch {
      continue;
    }
  }
  return null;
}

async function getTodaysBundles() {
  try {
    const res = await fetch(`${API_URL}/bundles`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as any[];
  } catch {
    return [];
  }
}

const TIER_COLORS: Record<string, string> = {
  safe: "text-brand-green",
  medium: "text-blue-400",
  high: "text-brand-yellow",
  mega: "text-brand-red",
};

const TIER_BORDERS: Record<string, string> = {
  safe: "border-green-900/50",
  medium: "border-blue-900/50",
  high: "border-yellow-900/50",
  mega: "border-red-900/50",
};

const TIER_BG: Record<string, string> = {
  safe: "bg-green-950/20",
  medium: "bg-blue-950/20",
  high: "bg-yellow-950/20",
  mega: "bg-red-950/20",
};

export default async function HomePage() {
  const [{ picks: featuredPicks, dateLabel: picksDateLabel }, recentResultsData, todaysBundles] = await Promise.all([
    getFeaturedPicks(),
    getRecentResults(),
    getTodaysBundles(),
  ]);

  const recentResults: any[] = (recentResultsData?.results ?? []).slice(0, 5);
  const wonCount = recentResults.filter((r: any) => r.won).length;
  const hasRealResults = recentResults.length > 0;
  const hasRealPicks = featuredPicks.length > 0;

  const STATS = [
    {
      label: "Accuracy (Last 7 Days)",
      value: hasRealResults ? `${Math.round((wonCount / recentResults.length) * 100)}%` : "—",
      color: "text-brand-green",
    },
    { label: "Predictions Made", value: "1,240+", color: "text-white" },
    { label: "Active Members", value: "4,800+", color: "text-white" },
    { label: "Commission Paid Out", value: "$12,400", color: "text-brand-yellow" },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-red-950 border border-red-900 text-brand-red text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Powered by AI & Historical Data
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              Sports Predictions
              <br />
              <span className="text-brand-red">You Can Trust</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Professional-grade football predictions with confidence ratings and full probability
              breakdowns — backed by a machine-learning engine, verified by real results.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/bundles"
                className="inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-lg text-base transition-colors"
              >
                🔥 Browse Today&apos;s Bundles
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/predictions"
                className="inline-flex items-center justify-center gap-2 bg-brand-card border border-brand-border hover:border-gray-500 text-white font-bold px-8 py-3.5 rounded-lg text-base transition-colors"
              >
                See Free Picks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-brand-border bg-brand-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-brand-muted text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Today's Featured Picks */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-black text-xl">
            <Star className="w-5 h-5 text-brand-red inline mr-2" />
            {picksDateLabel}
          </h2>
          <Link
            href="/predictions"
            className="text-brand-red text-sm font-bold hover:text-red-400 transition-colors flex items-center gap-1"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {hasRealPicks ? (
          <div className="grid md:grid-cols-2 gap-3">
            {featuredPicks.map((p: any, i: number) => {
              const kickoff = new Date(p.match.kickoff);
              const timeStr = kickoff.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
              const badgeClass = CONFIDENCE_BADGE[p.confidence] ?? CONFIDENCE_BADGE.low;
              const confidenceLabel = `${p.confidence.toUpperCase()} ${Math.max(p.homeWinPct, p.drawPct, p.awayWinPct)}%`;

              return (
                <div key={p.matchId} className="bg-brand-card border border-brand-border rounded-lg p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-brand-muted text-xs mb-1">{p.match.league} · {timeStr} UTC</p>
                      <p className="text-white font-bold">{p.match.homeTeam.name} vs {p.match.awayTeam.name}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded border ${badgeClass}`}>
                      {confidenceLabel}
                    </span>
                  </div>
                  {!p.locked ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: "Home", pct: p.homeWinPct, pick: "1" },
                        { label: "Draw", pct: p.drawPct, pick: "X" },
                        { label: "Away", pct: p.awayWinPct, pick: "2" },
                      ].map(({ label, pct, pick }) => (
                        <div key={label} className={`odds-btn ${p.bestPick === pick ? "selected" : ""}`}>
                          <span className="label">{label}</span>
                          <span className="value">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="grid grid-cols-3 gap-1.5 blur-sm opacity-60 select-none pointer-events-none">
                        {["Home ?", "Draw ?", "Away ?"].map((btn) => (
                          <div key={btn} className="odds-btn">
                            <span className="label">{btn.split(" ")[0]}</span>
                            <span className="value">{btn.split(" ")[1]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Link
                          href="/auth/signup"
                          className="flex items-center gap-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded transition-colors"
                        >
                          <Lock className="w-3 h-3" />
                          Unlock Predictions
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center">
            <p className="text-brand-muted text-sm mb-3">No predictions available yet for today.</p>
            <Link href="/predictions" className="text-brand-red text-sm font-bold hover:text-red-400">
              Check the predictions page →
            </Link>
          </div>
        )}
      </section>

      {/* Last 5 Results */}
      <section className="max-w-5xl mx-auto px-4 py-10 border-t border-brand-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-black text-xl mb-1">Our Recent Results</h2>
            {hasRealResults && (
              <p className="text-brand-muted text-xs">
                {wonCount}/{recentResults.length} correct yesterday &nbsp;·&nbsp;
                <span className="text-brand-green font-bold">
                  {Math.round((wonCount / recentResults.length) * 100)}% accuracy
                </span>
              </p>
            )}
          </div>
          <Link href="/results" className="text-brand-red text-sm font-bold hover:text-red-400 flex items-center gap-1">
            Full History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {hasRealResults ? (
          <div className="space-y-2">
            {recentResults.map((r: any) => (
              <div key={r.matchId} className="bg-brand-card border border-brand-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-brand-muted text-[11px] shrink-0 hidden sm:block">{r.match.league}</span>
                  <span className="text-white text-sm font-bold truncate">
                    {r.match.homeTeam.name} <span className="text-brand-muted font-normal">vs</span> {r.match.awayTeam.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-brand-muted text-xs font-mono">{r.homeScore}–{r.awayScore}</span>
                  <span className="text-white text-xs">→ <span className="text-brand-muted">{r.prediction}</span></span>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${r.won ? "bg-green-950 text-brand-green border-green-900" : "bg-red-950 text-brand-red border-red-900"}`}>
                    {r.won ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.won ? "WON" : "LOST"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center">
            <p className="text-brand-muted text-sm mb-3">Results appear here after yesterday&apos;s matches finish.</p>
            <Link href="/results" className="text-brand-red text-sm font-bold hover:text-red-400">
              View full history →
            </Link>
          </div>
        )}
      </section>

      {/* Today's Bundles */}
      <section className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-black text-xl flex items-center gap-2">
              <Flame className="w-5 h-5 text-brand-red" />
              Today&apos;s Bundles
            </h2>
            <p className="text-brand-muted text-xs mt-1">AI-assembled betting combos — pay once, get all picks</p>
          </div>
          <Link
            href="/bundles"
            className="text-brand-red text-sm font-bold hover:text-red-400 transition-colors flex items-center gap-1"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todaysBundles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {todaysBundles.slice(0, 4).map((bundle: any) => (
              <div
                key={bundle.id}
                className={`rounded-xl border p-4 ${TIER_BG[bundle.tier] ?? "bg-brand-card"} ${TIER_BORDERS[bundle.tier] ?? "border-brand-border"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${TIER_BORDERS[bundle.tier] ?? "border-brand-border"} ${TIER_COLORS[bundle.tier] ?? "text-white"}`}>
                    {bundle.tier}
                  </span>
                  <span className={`text-xl font-black ${TIER_COLORS[bundle.tier] ?? "text-white"}`}>
                    {bundle.total_odds}x
                  </span>
                </div>
                <p className="text-white font-bold text-sm mb-1 leading-tight">{bundle.name}</p>
                <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-4">
                  <Lock className="w-3 h-3" />
                  {bundle.pick_count} picks hidden
                </div>
                <Link
                  href="/bundles"
                  className="flex items-center justify-center gap-1.5 w-full bg-brand-red hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  Unlock ${bundle.price.toFixed(2)}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center">
            <Flame className="w-8 h-8 text-brand-muted mx-auto mb-3" />
            <p className="text-brand-muted text-sm mb-3">No bundles have been published yet. Check back soon.</p>
            <Link href="/predictions" className="text-brand-red text-sm font-bold hover:text-red-400">
              Browse free fixtures instead →
            </Link>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">How Sure Odds Works</h2>
        <p className="text-brand-muted text-center text-sm mb-10">From data to decision in seconds</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map(({ num, title, desc }) => (
            <div key={num} className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="text-brand-red font-black text-3xl mb-3 font-mono">{num}</div>
              <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">Why Choose Sure Odds?</h2>
        <p className="text-brand-muted text-center text-sm mb-10">Built differently from every tipster site you&apos;ve tried</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-brand-card border border-brand-border rounded-xl p-5 flex gap-4">
              <div className="w-10 h-10 bg-red-950 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1.5">{title}</h3>
                <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">Choose How You Play</h2>
        <p className="text-brand-muted text-center text-sm mb-10">Free picks every day. Credits for cherry-pickers. Bundles for combo bettors.</p>

        <div className="grid md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? "bg-gradient-to-b from-red-950/40 to-brand-card border-brand-red"
                  : "bg-brand-card border-brand-border"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full border ${plan.highlight ? "bg-brand-red border-brand-red text-white" : "bg-yellow-950 border-yellow-900 text-brand-yellow"}`}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <p className="text-brand-muted text-xs font-bold uppercase tracking-widest mb-1">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-white font-black text-4xl">{plan.price}</span>
                  <span className="text-brand-muted text-sm mb-1">/{plan.period}</span>
                </div>
                <p className="text-brand-muted text-xs">{plan.desc}</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.locked.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-brand-muted line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full text-center font-bold py-3 rounded-lg text-sm transition-colors ${
                  plan.highlight
                    ? "bg-brand-red hover:bg-red-700 text-white"
                    : "bg-brand-dark border border-brand-border hover:border-gray-500 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-brand-muted text-xs mt-6">
          No subscriptions. Pay only for what you use — credits or bundles.{" "}
          <Link href="/pricing" className="text-white hover:text-brand-green underline underline-offset-2">
            See full pricing →
          </Link>
        </p>
      </section>

      {/* Partner Teaser */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-yellow-950/60 to-brand-card border border-yellow-900/50 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-950 border border-yellow-900 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-brand-yellow" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg mb-1">
                Got an audience? Earn <span className="text-brand-yellow">30% commission</span>.
              </h3>
              <p className="text-brand-muted text-sm">
                Apply to our affiliate program. Approved partners get a unique referral link and earn monthly from every subscriber they bring in.
              </p>
            </div>
          </div>
          <Link
            href="/partner"
            className="shrink-0 inline-flex items-center gap-2 bg-brand-yellow hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Apply to Partner <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">Frequently Asked Questions</h2>
        <p className="text-brand-muted text-center text-sm mb-10">Everything you need to know</p>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-brand-card border border-brand-border rounded-xl">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                <span className="text-white font-bold text-sm">{q}</span>
                <ChevronDown className="w-4 h-4 text-brand-muted group-open:rotate-180 transition-transform shrink-0 ml-3" />
              </summary>
              <div className="px-5 pb-4 text-brand-muted text-xs leading-relaxed border-t border-brand-border pt-3">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-red-950 to-brand-card border border-red-900 rounded-xl p-10 text-center">
          <h2 className="text-white font-black text-3xl mb-3">Ready to Bet Smarter?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Browse free predictions daily, or let our AI do the work — grab a ready-to-place Bundle and get every pick revealed instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/bundles"
              className="inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-black px-10 py-4 rounded-lg text-lg transition-colors"
            >
              🔥 Browse Bundles
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-brand-card border border-brand-border hover:border-gray-500 text-white font-bold px-8 py-4 rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
