import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { CheckCircle, XCircle, Zap, Star, Shield } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/forever",
    tagline: "Get a taste of data-driven predictions.",
    icon: Zap,
    iconColor: "text-brand-muted",
    iconBg: "bg-brand-dark",
    cta: "Get Started",
    ctaHref: "/auth/signup",
    ctaStyle: "border border-brand-border text-white hover:bg-brand-card",
    badge: null,
    included: [
      "2 predictions per day",
      "Basic match info",
      "Results page access",
      "Community Telegram access",
    ],
    excluded: [
      "Full probability breakdown",
      "High-confidence picks",
      "Multi-market predictions",
      "Email alerts",
    ],
  },
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
    ctaHref: "/auth/login?redirect=/packages?plan=premium",
    ctaStyle: "bg-brand-yellow hover:bg-yellow-500 text-black",
    badge: "Most Popular",
    badgeStyle: "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30",
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
    ctaHref: "/auth/login?redirect=/packages?plan=pro",
    ctaStyle: "bg-brand-red hover:bg-red-700 text-white",
    badge: "Best Value",
    badgeStyle: "bg-brand-red/20 text-brand-red border-brand-red/30",
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
            Start free. Upgrade when you&apos;re ready.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPremium = plan.id === "premium";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  isPremium
                    ? "border-brand-yellow/50 bg-gradient-to-b from-yellow-950/20 to-brand-card"
                    : plan.id === "pro"
                    ? "border-brand-red/40 bg-gradient-to-b from-red-950/10 to-brand-card"
                    : "border-brand-border bg-brand-card"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${plan.badgeStyle}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.iconBg}`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg leading-none">{plan.name}</h2>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-white font-black text-2xl">{plan.price}</span>
                      <span className="text-brand-muted text-xs">{plan.period}</span>
                    </div>
                  </div>
                </div>

                <p className="text-brand-muted text-sm mb-5 leading-relaxed">{plan.tagline}</p>

                {/* Features */}
                <div className="space-y-2.5 flex-1 mb-6">
                  {plan.included.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                      <span className="text-white text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.excluded.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-brand-muted/50 shrink-0 mt-0.5" />
                      <span className="text-brand-muted text-sm line-through">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.ctaHref}
                  className={`w-full py-3 rounded-xl font-black text-sm text-center transition-colors block ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* FAQ / Trust row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { title: "Cancel anytime", body: "No contracts. Cancel your subscription at any time with one click." },
            { title: "Secure payments", body: "All payments processed securely through Paystack. We never store card details." },
            { title: "Data-driven only", body: "Every prediction is generated from historical match data and statistical models — no gut feelings." },
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
