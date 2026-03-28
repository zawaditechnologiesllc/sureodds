import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import {
  CheckCircle,
  Zap,
  Shield,
  CreditCard,
  Flame,
  TrendingUp,
  Lock,
  ArrowRight,
  Star,
} from "lucide-react";

const BUNDLES = [
  {
    tier: "safe",
    name: "Safe Slip",
    icon: Shield,
    iconColor: "text-brand-green",
    iconBg: "bg-green-950/40",
    borderColor: "border-green-900/60",
    cardBg: "bg-gradient-to-b from-green-950/20 to-brand-card",
    badgeColor: "bg-green-950 text-brand-green border-green-900",
    odds: "5–10x",
    picks: "3–5 picks",
    price: "$10",
    desc: "Safer combos built from our highest-confidence predictions. Great starting point.",
    features: [
      "3–5 AI-selected picks",
      "Full probability breakdown",
      "Match-level confidence scores",
      "All picks revealed after payment",
    ],
  },
  {
    tier: "medium",
    name: "Medium Slip",
    icon: TrendingUp,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-950/40",
    borderColor: "border-blue-900/60",
    cardBg: "bg-gradient-to-b from-blue-950/20 to-brand-card",
    badgeColor: "bg-blue-950 text-blue-400 border-blue-900",
    odds: "20–50x",
    picks: "5–8 picks",
    price: "$20",
    desc: "Medium-risk combos balancing probability and returns. Most popular tier.",
    badge: "Most Popular",
    features: [
      "5–8 AI-selected picks",
      "Full probability breakdown",
      "Match-level confidence scores",
      "All picks revealed after payment",
    ],
  },
  {
    tier: "high",
    name: "High Roller",
    icon: Zap,
    iconColor: "text-brand-yellow",
    iconBg: "bg-yellow-950/40",
    borderColor: "border-yellow-900/60",
    cardBg: "bg-gradient-to-b from-yellow-950/20 to-brand-card",
    badgeColor: "bg-yellow-950 text-brand-yellow border-yellow-900",
    odds: "100–300x",
    picks: "8–12 picks",
    price: "$30",
    desc: "High-risk, high-reward combos for experienced punters chasing big returns.",
    features: [
      "8–12 AI-selected picks",
      "Full probability breakdown",
      "Match-level confidence scores",
      "All picks revealed after payment",
    ],
  },
  {
    tier: "mega",
    name: "Mega Slip",
    icon: Flame,
    iconColor: "text-brand-red",
    iconBg: "bg-red-950/40",
    borderColor: "border-red-900/60",
    cardBg: "bg-gradient-to-b from-red-950/10 to-brand-card",
    badgeColor: "bg-red-950 text-brand-red border-red-900",
    odds: "500–1000x",
    picks: "10–15 picks",
    price: "$50",
    desc: "The biggest combos we build. Maximum picks, maximum multiplier. Only for the brave.",
    features: [
      "10–15 AI-selected picks",
      "Full probability breakdown",
      "Match-level confidence scores",
      "All picks revealed after payment",
    ],
  },
];

const CREDIT_PACKAGES = [
  {
    name: "Starter",
    picks: "5 picks",
    desc: "Try a few premium picks without committing.",
    highlight: false,
  },
  {
    name: "Value Pack",
    picks: "10 picks",
    desc: "Best for a week of daily premium predictions.",
    highlight: true,
  },
  {
    name: "Pro Pack",
    picks: "20 picks",
    desc: "A full month of high-confidence unlocks.",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-brand-red text-xs font-bold uppercase tracking-wide">Pricing</span>
          </div>
          <h1 className="text-white font-black text-4xl md:text-5xl mb-4 leading-tight">
            Choose How You Play
          </h1>
          <p className="text-brand-muted text-base max-w-lg mx-auto">
            Browse free. Unlock individual picks with credits. Or go all-in with a Bundle — our AI assembles the full combo so you don&apos;t have to.
          </p>
        </div>

        {/* ── Free Tier Banner ─────────────────────────────────── */}
        <div className="mb-10 bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-dark border border-brand-border rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-brand-muted" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg leading-none mb-1">Free — Always</h2>
              <p className="text-brand-muted text-sm">2 free predictions every day, no card required. See match odds, confidence badges, and our full results history.</p>
            </div>
          </div>
          <Link
            href="/auth/signup"
            className="shrink-0 inline-flex items-center gap-2 bg-brand-card border border-brand-border hover:border-gray-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 border-t border-brand-border" />
          <span className="text-brand-muted text-xs font-bold uppercase tracking-widest">Want more?</span>
          <div className="flex-1 border-t border-brand-border" />
        </div>

        {/* ── Section 1: Bundles ─────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-5 h-5 text-brand-red" />
            <h2 className="text-white font-black text-2xl">🔥 Bundles</h2>
          </div>
          <p className="text-brand-muted text-sm mb-8 ml-8 max-w-xl">
            Our AI assembles a ready-to-bet combo. Pay once — every pick in the bundle unlocks instantly. New bundles generated daily.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {BUNDLES.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.tier}
                  className={`relative rounded-2xl border p-6 flex flex-col ${b.cardBg} ${b.borderColor}`}
                >
                  {b.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${b.badgeColor}`}>
                        {b.badge}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.iconBg}`}>
                      <Icon className={`w-5 h-5 ${b.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-base leading-none">{b.name}</h3>
                      <p className={`text-xs font-black mt-0.5 ${b.iconColor}`}>{b.odds} odds</p>
                    </div>
                  </div>

                  <p className="text-brand-muted text-xs leading-relaxed mb-4 flex-1">{b.desc}</p>

                  <div className="space-y-1.5 mb-5">
                    {b.features.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-white text-xs">{f}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-brand-muted shrink-0 mt-0.5" />
                      <span className="text-brand-muted text-xs">{b.picks} hidden until purchased</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-black text-2xl">{b.price}</span>
                    <span className="text-brand-muted text-xs">one-time</span>
                  </div>

                  <Link
                    href="/bundles"
                    className="w-full py-3 rounded-xl text-sm text-center font-bold transition-colors block bg-brand-red hover:bg-red-700 text-white"
                  >
                    Get {b.name}
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-brand-muted text-xs mt-5">
            Bundles are pre-generated daily by our AI engine from today&apos;s highest-confidence predictions.{" "}
            <Link href="/bundles" className="text-white hover:text-brand-green underline underline-offset-2">
              Browse today&apos;s bundles →
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 border-t border-brand-border" />
          <span className="text-brand-muted text-xs font-bold uppercase tracking-widest">or</span>
          <div className="flex-1 border-t border-brand-border" />
        </div>

        {/* ── Section 2: Pay-as-You-Go Credits ─────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-brand-green" />
            <h2 className="text-white font-black text-2xl">Pick Credits</h2>
          </div>
          <p className="text-brand-muted text-sm mb-8 ml-8 max-w-xl">
            Prefer to choose your own matches? Buy a pack of credits and unlock individual predictions one at a time. Credits never expire.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  pkg.highlight
                    ? "border-brand-green/50 bg-gradient-to-b from-green-950/20 to-brand-card"
                    : "border-brand-border bg-brand-card"
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-black px-3 py-1 rounded-full border bg-green-950/40 text-brand-green border-brand-green/30">
                      Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-black text-lg">{pkg.name}</h3>
                  <div className="bg-brand-green/10 border border-brand-green/20 rounded-lg px-2.5 py-1">
                    <span className="text-brand-green text-xs font-bold">{pkg.picks}</span>
                  </div>
                </div>

                <p className="text-brand-muted text-sm mb-6 flex-1">{pkg.desc}</p>

                <div className="space-y-2 mb-6">
                  {["Full probability breakdown", "Confidence rating included", "Credits never expire"].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" />
                      <span className="text-white text-xs">{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth/login?redirect=/packages"
                  className="w-full py-3 rounded-xl text-sm text-center transition-colors block border border-brand-green/40 text-brand-green hover:bg-brand-green/10 font-bold"
                >
                  Buy {pkg.picks}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-brand-muted text-xs mt-4">
            Already have an account?{" "}
            <Link href="/auth/login?redirect=/packages" className="text-white hover:text-brand-green underline underline-offset-2">
              Log in to buy credits
            </Link>
          </p>
        </div>

        {/* Comparison Table */}
        <div className="mb-16 bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-brand-border">
            <h2 className="text-white font-black text-lg">Compare Your Options</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left text-xs text-brand-muted font-medium px-6 py-3 w-1/3">Feature</th>
                  <th className="text-center text-xs text-brand-muted font-medium px-4 py-3">Free</th>
                  <th className="text-center text-xs text-brand-muted font-medium px-4 py-3">Pick Credits</th>
                  <th className="text-center text-xs text-brand-muted font-medium px-4 py-3 text-brand-red">Bundles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {[
                  ["Daily predictions", "2 picks", "Unlimited*", "Full bundle"],
                  ["Full probability breakdown", "✗", "✓", "✓"],
                  ["Confidence badges", "✓", "✓", "✓"],
                  ["AI-assembled combos", "✗", "✗", "✓"],
                  ["Pick selection", "Random 2", "You choose", "AI chooses"],
                  ["Pricing", "Free", "Per pack", "$10–$50"],
                  ["Best for", "Casual browsing", "Cherry-picking", "Combo bettors"],
                ].map(([feat, free, credits, bundles]) => (
                  <tr key={feat} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3 text-white text-sm font-medium">{feat}</td>
                    <td className="px-4 py-3 text-center text-brand-muted text-sm">{free}</td>
                    <td className="px-4 py-3 text-center text-brand-muted text-sm">{credits}</td>
                    <td className="px-4 py-3 text-center text-white text-sm font-bold">{bundles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-brand-muted px-6 py-3 border-t border-brand-border">
            * Credits unlock individual picks; each credit = 1 pick
          </p>
        </div>

        {/* Trust Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { title: "No subscriptions", body: "We don't lock you into monthly plans. Pay only when you want picks — credits or bundles, your call." },
            { title: "Secure payments", body: "All payments processed securely through Paystack. We never store your card details." },
            { title: "Data-driven only", body: "Every prediction is generated from historical data and statistical models — no gut feelings, no tipster bias." },
          ].map(({ title, body }) => (
            <div key={title} className="bg-brand-card border border-brand-border rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
