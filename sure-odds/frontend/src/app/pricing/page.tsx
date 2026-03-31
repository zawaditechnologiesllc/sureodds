import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import {
  CheckCircle,
  Zap,
  CreditCard,
  ArrowRight,
  Star,
  ShieldCheck,
  Clock,
} from "lucide-react";

const VALUE_PACKS = [
  {
    id: 1,
    name: "Starter Pack",
    picks: 5,
    price: "$2.99",
    perPick: "$0.598",
    desc: "Try a few premium picks without committing.",
    features: [
      "5 premium picks",
      "Full probability breakdown",
      "Confidence ratings included",
      "Credits never expire",
    ],
    highlight: false,
  },
  {
    id: 2,
    name: "Value Pack",
    picks: 10,
    price: "$4.99",
    perPick: "$0.499",
    desc: "Best for a week of daily premium predictions.",
    features: [
      "10 premium picks",
      "Full probability breakdown",
      "Confidence ratings included",
      "Credits never expire",
      "Save 17% vs Starter",
    ],
    highlight: true,
    badge: "Most Popular",
  },
  {
    id: 3,
    name: "Pro Pack",
    picks: 20,
    price: "$8.99",
    perPick: "$0.449",
    desc: "A full month of high-confidence unlocks.",
    features: [
      "20 premium picks",
      "Full probability breakdown",
      "Confidence ratings included",
      "Credits never expire",
      "Lowest cost per pick",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-full px-4 py-1.5 mb-4">
            <CreditCard className="w-3.5 h-3.5 text-brand-green" />
            <span className="text-brand-green text-xs font-bold uppercase tracking-widest">Value Packs</span>
          </div>
          <h1 className="text-white font-black text-4xl md:text-5xl mb-4 leading-tight">
            Pick Credits
          </h1>
          <p className="text-brand-muted text-base max-w-lg mx-auto">
            Buy a pack of credits and unlock individual predictions one at a time — your picks, your matches. Credits never expire.
          </p>
        </div>

        {/* ── Free Tier Note ── */}
        <div className="mb-10 bg-brand-card border border-brand-border rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-dark border border-brand-border rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-brand-muted" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Free — Always</p>
              <p className="text-brand-muted text-xs mt-0.5">2 free predictions every day. No card required.</p>
            </div>
          </div>
          <Link
            href="/auth/signup"
            className="shrink-0 inline-flex items-center gap-2 border border-brand-border hover:border-gray-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Pack Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {VALUE_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                pack.highlight
                  ? "border-brand-green/50 bg-gradient-to-b from-green-950/20 to-brand-card"
                  : "border-brand-border bg-brand-card"
              }`}
            >
              {pack.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-black px-3 py-1 rounded-full border bg-green-950/40 text-brand-green border-brand-green/30 whitespace-nowrap">
                    {pack.badge}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-black text-xl leading-none">{pack.name}</h3>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-brand-green font-black text-2xl leading-none">{pack.price}</p>
                  <p className="text-brand-muted text-[11px] mt-0.5">{pack.perPick} / pick</p>
                </div>
              </div>

              <p className="text-brand-muted text-sm mb-5">{pack.desc}</p>

              <div className="space-y-2.5 flex-1 mb-7">
                {pack.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    <span className="text-white text-sm">{f}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/auth/login?redirect=/packages"
                className={`w-full py-3.5 rounded-xl text-sm text-center font-black transition-all block ${
                  pack.highlight
                    ? "bg-brand-green hover:bg-green-600 text-black"
                    : "border border-brand-green/40 text-brand-green hover:bg-brand-green/10"
                }`}
              >
                Buy {pack.picks} Picks — {pack.price}
              </Link>
            </div>
          ))}
        </div>

        {/* ── How credits work ── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 mb-8">
          <h3 className="text-white font-black text-lg mb-6">How Pick Credits work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: CreditCard, step: "1", title: "Buy a pack", body: "Choose Starter (5), Value (10), or Pro (20). Pay via card or M-Pesa." },
              { icon: Zap, step: "2", title: "Pick your matches", body: "Browse predictions and spend one credit to unlock any match you choose." },
              { icon: CheckCircle, step: "3", title: "Credits never expire", body: "Unused credits stay on your account forever — use them whenever you want." },
            ].map(({ icon: Icon, step, title, body }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-green/10 border border-brand-green/30 flex items-center justify-center text-brand-green text-xs font-black shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{title}</p>
                  <p className="text-brand-muted text-xs leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Compare with other options ── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 mb-8">
          <h3 className="text-white font-black text-lg mb-4">Compare all options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Pick Credits",
                subtitle: "Choose your own picks",
                price: "From $2.99",
                href: "/auth/login?redirect=/packages",
                cta: "Buy Credits",
                color: "border-brand-green/40 bg-green-950/10",
                ctaColor: "bg-brand-green hover:bg-green-600 text-black",
                points: ["You choose each match", "Credits never expire", "Unlock one at a time"],
              },
              {
                title: "VIP Access",
                subtitle: "All tips, fixed period",
                price: "From KSh 200",
                href: "/vip",
                cta: "Get VIP",
                color: "border-yellow-700/40 bg-yellow-950/10",
                ctaColor: "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black",
                points: ["All VIP tips unlocked", "Daily, Weekly, Monthly", "No per-pick credits"],
              },
              {
                title: "Bundles",
                subtitle: "AI-assembled combos",
                price: "From $10",
                href: "/bundles",
                cta: "Browse Bundles",
                color: "border-red-900/40 bg-red-950/10",
                ctaColor: "bg-brand-red hover:bg-red-700 text-white",
                points: ["AI picks the combo", "3–15 matches per slip", "Pay once, full slip"],
              },
            ].map(({ title, subtitle, price, href, cta, color, ctaColor, points }) => (
              <div key={title} className={`rounded-xl border p-5 flex flex-col ${color}`}>
                <p className="text-white font-black text-base mb-0.5">{title}</p>
                <p className="text-brand-muted text-xs mb-3">{subtitle}</p>
                <p className="text-white font-bold text-lg mb-4">{price}</p>
                <ul className="space-y-1.5 flex-1 mb-4">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-xs text-brand-muted">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" /> {pt}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`w-full py-2.5 rounded-xl text-sm text-center font-bold transition-all block ${ctaColor}`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: CreditCard, title: "No subscriptions", body: "Pay only when you want picks. No monthly fees, no auto-renewals." },
            { icon: ShieldCheck, title: "Secure payments", body: "All payments processed securely through Paystack. Card & Mobile Money supported." },
            { icon: Clock, title: "Credits never expire", body: "Unused credits stay on your account indefinitely — use them at your own pace." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-brand-card border border-brand-border rounded-xl p-5 flex items-start gap-3">
              <Icon className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
                <p className="text-brand-muted text-xs leading-relaxed">{body}</p>
              </div>
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
