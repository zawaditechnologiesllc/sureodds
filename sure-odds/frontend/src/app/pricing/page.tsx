import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { CheckCircle, XCircle, Zap, Star, Shield, CreditCard } from "lucide-react";

const monthlyPlans = [
  {
    id: "premium",
    name: "Premium",
    price: "$9.99",
    period: "/per month",
    tagline: "Everything you need to bet smarter every day.",
    icon: Star,
    iconColor: "text-brand-yellow",
    iconBg: "bg-yellow-950/40",
    cta: "Start Premium",
    ctaHref: "/auth/signup?redirect=/dashboard",
    ctaStyle: "bg-brand-yellow hover:bg-yellow-500 text-black font-black",
    badge: "Most Popular",
    badgeStyle: "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30",
    cardStyle: "border-brand-yellow/50 bg-gradient-to-b from-yellow-950/20 to-brand-card",
    included: [
      "Unlimited daily predictions",
      "Full probability breakdown",
      "High / Medium / Low confidence badges",
      "1X2, Over 2.5 & BTTS markets",
      "Email alerts for top picks",
      "Priority support",
    ],
    excluded: [],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19.99",
    period: "/per month",
    tagline: "For serious bettors who want the edge.",
    icon: Shield,
    iconColor: "text-brand-red",
    iconBg: "bg-red-950/40",
    cta: "Go Pro",
    ctaHref: "/auth/signup?redirect=/dashboard",
    ctaStyle: "bg-brand-red hover:bg-red-700 text-white font-black",
    badge: "Best Value",
    badgeStyle: "bg-brand-red/20 text-brand-red border-brand-red/30",
    cardStyle: "border-brand-red/40 bg-gradient-to-b from-red-950/10 to-brand-card",
    included: [
      "Everything in Premium",
      "Early access — predictions 48h ahead",
      "Telegram VIP group",
      "Weekly prediction performance report",
      "Access to partner affiliate program",
      "Dedicated account manager",
    ],
    excluded: [],
  },
];

const payAsYouGoPackages = [
  {
    id: 1,
    name: "Starter",
    picks: 2,
    price: "$0.10",
    perPick: "$0.05/pick",
    desc: "Try a couple of premium picks risk-free.",
    highlight: false,
  },
  {
    id: 2,
    name: "Value Pack",
    picks: 5,
    price: "$0.20",
    perPick: "$0.04/pick",
    desc: "Best for a week's worth of top picks.",
    highlight: true,
  },
  {
    id: 3,
    name: "Pro Bundle",
    picks: 10,
    price: "$1.00",
    perPick: "$0.10/pick",
    desc: "Full month of high-confidence predictions.",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-brand-red text-xs font-bold uppercase tracking-wide">Pricing</span>
          </div>
          <h1 className="text-white font-black text-4xl mb-3">Simple Pricing</h1>
          <p className="text-brand-muted text-base max-w-md mx-auto">
            Start free. Upgrade when you&apos;re ready. Choose a monthly plan or buy picks on demand — no commitment required.
          </p>
        </div>

        {/* ── Section 1: Monthly Plans ─────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-5 h-5 text-brand-yellow fill-current" />
            <h2 className="text-white font-black text-xl">Monthly Subscription Plans</h2>
            <span className="text-brand-muted text-sm">— unlimited access</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {monthlyPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 flex flex-col ${plan.cardStyle}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className={`text-xs font-black px-3 py-1 rounded-full border ${plan.badgeStyle}`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.iconBg}`}>
                      <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg leading-none">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-white font-black text-2xl">{plan.price}</span>
                        <span className="text-brand-muted text-xs">{plan.period}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-brand-muted text-sm mb-5 leading-relaxed">{plan.tagline}</p>

                  <div className="space-y-2.5 flex-1 mb-6">
                    {plan.included.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-white text-sm">{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <XCircle className="w-4 h-4 text-brand-muted/40 shrink-0 mt-0.5" />
                        <span className="text-brand-muted text-sm line-through">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={plan.ctaHref}
                    className={`w-full py-3 rounded-xl text-sm text-center transition-colors block ${plan.ctaStyle}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 border-t border-brand-border" />
          <span className="text-brand-muted text-sm font-bold uppercase tracking-widest">or</span>
          <div className="flex-1 border-t border-brand-border" />
        </div>

        {/* ── Section 2: Pay-as-You-Go ─────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-brand-green" />
            <h2 className="text-white font-black text-xl">Pay-as-You-Go Credits</h2>
            <span className="text-brand-muted text-sm">— no subscription</span>
          </div>
          <p className="text-brand-muted text-sm mb-6 ml-8">
            Not ready to subscribe? Buy individual pick credits and unlock only what you need. Credits never expire.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {payAsYouGoPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  pkg.highlight
                    ? "border-brand-green/50 bg-gradient-to-b from-green-950/20 to-brand-card"
                    : "border-brand-border bg-brand-card"
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-black px-3 py-1 rounded-full border bg-green-950/40 text-brand-green border-brand-green/30">
                      Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-black text-lg">{pkg.name}</h3>
                  <div className="bg-brand-green/10 border border-brand-green/20 rounded-lg px-2.5 py-1">
                    <span className="text-brand-green text-xs font-bold">{pkg.picks} picks</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-white font-black text-3xl">{pkg.price}</span>
                </div>
                <p className="text-brand-muted text-xs mb-3">{pkg.perPick}</p>
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
                  Buy {pkg.picks} Picks
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

        {/* Trust Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { title: "Cancel anytime", body: "No contracts. Cancel your monthly subscription with one click, no questions asked." },
            { title: "Secure payments", body: "All payments processed securely through Paystack. We never store your card details." },
            { title: "Data-driven only", body: "Every prediction is generated from historical data and statistical models — no gut feelings." },
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
