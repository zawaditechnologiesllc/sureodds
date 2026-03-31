"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import {
  CheckCircle, Zap, CreditCard, ArrowRight, ShieldCheck, Clock, Loader2, Star,
} from "lucide-react";
import { fetchPackages, fetchUserCredits, verifyPayment } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import toast from "react-hot-toast";
import PaymentMethodModal from "@/components/payment/PaymentMethodModal";
import Link from "next/link";

interface Package {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
}

const STATIC_PACKS: (Package & { badge?: string; highlight: boolean; desc: string; features: string[] })[] = [
  {
    id: 1,
    name: "Starter Pack",
    price: 2.99,
    picks_count: 2,
    currency: "USD",
    highlight: false,
    desc: "Try a few premium picks without committing.",
    features: [
      "2 premium picks",
      "Full probability breakdown",
      "Confidence ratings included",
      "Credits never expire",
    ],
  },
  {
    id: 2,
    name: "Value Pack",
    price: 4.99,
    picks_count: 5,
    currency: "USD",
    badge: "Most Popular",
    highlight: true,
    desc: "Best for a solid week of premium unlocks.",
    features: [
      "5 premium picks",
      "Full probability breakdown",
      "Confidence ratings included",
      "Credits never expire",
      "Best value per pick",
    ],
  },
  {
    id: 3,
    name: "Pro Pack",
    price: 8.99,
    picks_count: 10,
    currency: "USD",
    highlight: false,
    desc: "A full month of high-confidence unlocks.",
    features: [
      "10 premium picks",
      "Full probability breakdown",
      "Confidence ratings included",
      "Credits never expire",
      "Lowest cost per pick",
    ],
  },
];

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [packs, setPacks] = useState(STATIC_PACKS);
  const [credits, setCredits] = useState<number | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingPkg, setPayingPkg] = useState<Package | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchPackages()
      .then((pkgs: Package[]) => {
        if (pkgs && pkgs.length > 0) {
          const merged = STATIC_PACKS.map((sp) => {
            const live = pkgs.find((p) => p.id === sp.id);
            return live ? { ...sp, price: live.price, picks_count: live.picks_count, currency: live.currency ?? sp.currency } : sp;
          });
          setPacks(merged);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserCredits().then(setCredits).catch(() => null);
    }
  }, [isAuthenticated]);

  const handleVerify = useCallback(
    async (ref: string) => {
      setVerifying(true);
      try {
        const data = await verifyPayment(ref);
        const url = new URL(window.location.href);
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.toString());
        toast.success(`✅ ${data.picks_added ?? ""} picks added to your account!`, { duration: 6000 });
        fetchUserCredits().then(setCredits).catch(() => null);
      } catch {
        toast.error("Verification failed. Contact support if you were charged.");
      } finally {
        setVerifying(false);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated) return;
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref) handleVerify(ref);
  }, [searchParams, isAuthenticated, handleVerify]);

  const handleBuy = (pkg: typeof packs[0]) => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/pricing");
      return;
    }
    setPayingPkg(pkg);
    setShowPayModal(true);
  };

  const handlePaySuccess = (picksAdded: number) => {
    setShowPayModal(false);
    setPayingPkg(null);
    toast.success(`✅ ${picksAdded} picks added to your account!`, { duration: 6000 });
    fetchUserCredits().then(setCredits).catch(() => null);
    router.push("/predictions");
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">Confirming your payment...</p>
          <p className="text-brand-muted text-sm mt-2">Adding your credits now.</p>
        </div>
      </div>
    );
  }

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
            Buy a pack of credits and unlock individual predictions one at a time. Your picks, your matches — credits never expire.
          </p>

          {/* Credits balance */}
          {isAuthenticated && credits !== null && (
            <div className="inline-flex items-center gap-2 mt-5 bg-brand-card border border-brand-border rounded-full px-4 py-2">
              <Zap className="w-4 h-4 text-brand-yellow" />
              <span className="text-white font-bold text-sm">{credits} credit{credits !== 1 ? "s" : ""} remaining</span>
            </div>
          )}
        </div>

        {/* ── Free Tier Note ── */}
        {!authLoading && !isAuthenticated && (
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
        )}

        {/* ── Pack Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {packs.map((pack) => (
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
                  <p className="text-brand-green font-black text-2xl leading-none">${pack.price.toFixed(2)}</p>
                  <p className="text-brand-muted text-[11px] mt-0.5">
                    ${(pack.price / pack.picks_count).toFixed(2)} / pick
                  </p>
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

              <button
                onClick={() => handleBuy(pack)}
                className={`w-full py-3.5 rounded-xl text-sm text-center font-black transition-all ${
                  pack.highlight
                    ? "bg-brand-green hover:bg-green-600 text-black"
                    : "border border-brand-green/40 text-brand-green hover:bg-brand-green/10"
                }`}
              >
                {isAuthenticated
                  ? `Buy ${pack.picks_count} Picks — $${pack.price.toFixed(2)}`
                  : `Get ${pack.picks_count} Picks — $${pack.price.toFixed(2)}`}
              </button>
            </div>
          ))}
        </div>

        {/* ── Login nudge ── */}
        {!authLoading && !isAuthenticated && (
          <div className="mb-10 bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold mb-1">Login required to purchase</p>
              <p className="text-brand-muted text-sm">You need an account to buy pick credits. Free to create.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => router.push("/auth/login?redirect=/pricing")}
                className="bg-brand-red hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/auth/signup?redirect=/pricing")}
                className="border border-brand-border hover:border-gray-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* ── How credits work ── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 mb-8">
          <h3 className="text-white font-black text-lg mb-6">How Pick Credits work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Buy a pack", body: "Choose Starter, Value, or Pro. Pay via card or M-Pesa / Airtel Money." },
              { step: "2", title: "Pick your matches", body: "Browse predictions and spend one credit to unlock any match you choose." },
              { step: "3", title: "Credits never expire", body: "Unused credits stay on your account forever — use them whenever you want." },
            ].map(({ step, title, body }) => (
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
                subtitle: "You choose each match",
                href: "/pricing",
                cta: "Buy Credits",
                active: true,
                color: "border-brand-green/50 bg-green-950/10",
                ctaColor: "bg-brand-green hover:bg-green-600 text-black",
                points: ["Unlock individual picks", "Credits never expire", "Pay per pack, no sub"],
              },
              {
                title: "VIP Access",
                subtitle: "All tips for a fixed period",
                href: "/vip",
                cta: "Get VIP",
                active: false,
                color: "border-yellow-700/40 bg-yellow-950/10",
                ctaColor: "bg-gradient-to-r from-yellow-500 to-amber-600 text-black",
                points: ["All VIP tips unlocked", "Daily, Weekly, Monthly", "No per-pick credits"],
              },
              {
                title: "Bundles",
                subtitle: "AI-assembled betting slips",
                href: "/bundles",
                cta: "Browse Bundles",
                active: false,
                color: "border-red-900/40 bg-red-950/10",
                ctaColor: "bg-brand-red hover:bg-red-700 text-white",
                points: ["AI picks the combo", "3–15 matches per slip", "Pay once, full slip"],
              },
            ].map(({ title, subtitle, href, cta, color, ctaColor, active, points }) => (
              <div key={title} className={`rounded-xl border p-5 flex flex-col ${color}`}>
                <p className="text-white font-black text-base mb-0.5">{title}</p>
                <p className="text-brand-muted text-xs mb-4">{subtitle}</p>
                <ul className="space-y-1.5 flex-1 mb-4">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-xs text-brand-muted">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" /> {pt}
                    </li>
                  ))}
                </ul>
                {active ? (
                  <button
                    onClick={() => handleBuy(packs[1])}
                    className={`w-full py-2.5 rounded-xl text-sm text-center font-bold transition-all block ${ctaColor}`}
                  >
                    {cta}
                  </button>
                ) : (
                  <Link
                    href={href}
                    className={`w-full py-2.5 rounded-xl text-sm text-center font-bold transition-all block ${ctaColor}`}
                  >
                    {cta}
                  </Link>
                )}
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

      {showPayModal && payingPkg && user?.email && (
        <PaymentMethodModal
          pkg={payingPkg}
          email={user.email}
          callbackUrl={typeof window !== "undefined" ? `${window.location.origin}/pricing` : "/pricing"}
          onClose={() => { setShowPayModal(false); setPayingPkg(null); }}
          onSuccess={handlePaySuccess}
          successMessage={`${payingPkg.picks_count} credits added to your account!`}
        />
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
