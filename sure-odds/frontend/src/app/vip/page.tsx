"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import { Crown, CheckCircle, Loader2, ArrowRight, ShieldCheck, Zap, Clock } from "lucide-react";
import { fetchVipPackages, fetchVipStatus, verifyPayment } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import toast from "react-hot-toast";
import PaymentMethodModal from "@/components/payment/PaymentMethodModal";

interface VipPackage {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
  package_type?: string;
  duration_days?: number;
  description?: string;
  features?: string;
}

interface VipStatus {
  is_active: boolean;
  expires_at: string | null;
  package_name: string | null;
  duration_days: number | null;
}

const STATIC_PLANS = [
  {
    id: 4,
    name: "Daily Tips",
    price: 200,
    picks_count: 0,
    currency: "KES",
    duration_days: 1,
    features: ["Today's premium selections", "Ideal for short-term access"],
  },
  {
    id: 5,
    name: "Weekly Access",
    price: 625,
    picks_count: 0,
    currency: "KES",
    duration_days: 7,
    features: ["Higher volume opportunities", "Best value"],
  },
  {
    id: 6,
    name: "Monthly Access",
    price: 1500,
    picks_count: 0,
    currency: "KES",
    duration_days: 30,
    features: [
      "Full access to daily VIP tips full month",
      "Best for serious bettors",
      "Consistent long-term plan",
    ],
  },
];

function VipContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [plans, setPlans] = useState<typeof STATIC_PLANS>(STATIC_PLANS);
  const [selected, setSelected] = useState<number>(STATIC_PLANS[1].id);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    fetchVipPackages()
      .then((pkgs: VipPackage[]) => {
        if (pkgs && pkgs.length > 0) {
          const merged = STATIC_PLANS.map((sp) => {
            const live = pkgs.find((p) => p.id === sp.id);
            if (!live) return sp;
            let features = sp.features;
            try { const parsed = JSON.parse(live.features || "[]"); if (parsed.length) features = parsed; } catch {}
            return { ...sp, price: live.price, name: live.name, features };
          });
          setPlans(merged);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVipStatus().then(setVipStatus).catch(() => null);
    }
  }, [isAuthenticated]);

  const handleVerify = useCallback(
    async (ref: string) => {
      setVerifying(true);
      try {
        await verifyPayment(ref);
        const url = new URL(window.location.href);
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.toString());
        toast.success("🏆 VIP Access activated! Enjoy your premium picks.", { duration: 6000 });
        fetchVipStatus().then(setVipStatus).catch(() => null);
        router.push("/predictions?vip=activated");
      } catch {
        toast.error("Payment verification failed. Contact support if funds were deducted.");
        setVerifying(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated) return;
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref) handleVerify(ref);
  }, [searchParams, isAuthenticated, handleVerify]);

  const handlePay = (planId: number) => {
    setSelected(planId);
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/vip");
      return;
    }
    setPayingId(planId);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayModal(false);
    setPayingId(null);
    toast.success("🏆 VIP Access activated! Enjoy your premium picks.", { duration: 6000 });
    fetchVipStatus().then(setVipStatus).catch(() => null);
    router.push("/predictions?vip=activated");
  };

  const selectedPkg = plans.find((p) => p.id === (payingId ?? selected));

  if (verifying) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">Confirming your payment...</p>
          <p className="text-brand-muted text-sm mt-2">Activating your VIP access now.</p>
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
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-4">
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">VIP Access</span>
          </div>
          <h1 className="text-white font-black text-4xl md:text-5xl mb-4 leading-tight">
            Premium Daily Tips
          </h1>
          <p className="text-brand-muted text-base max-w-lg mx-auto">
            Get unlimited access to every VIP prediction for a fixed period. Pay once — no credits, no limits.
          </p>
        </div>

        {/* ── Active VIP Banner ── */}
        {vipStatus?.is_active && (
          <div className="mb-10 flex items-center gap-4 bg-yellow-950/30 border border-yellow-600/30 rounded-2xl p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <p className="text-yellow-300 font-black text-base">VIP Active — {vipStatus.package_name}</p>
              <p className="text-brand-muted text-sm mt-0.5">
                Expires{" "}
                {vipStatus.expires_at
                  ? new Date(vipStatus.expires_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <button
              onClick={() => router.push("/predictions")}
              className="shrink-0 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-500/20 transition-colors"
            >
              View Picks <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Plan Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col hover:border-yellow-700/50 transition-all"
            >
              {/* Title + price row */}
              <div className="flex items-start justify-between mb-5">
                <p className="text-white font-black text-lg leading-tight">{plan.name}</p>
                <p className="text-brand-green font-black text-xl leading-tight shrink-0 ml-3">
                  KSh {plan.price.toLocaleString()}
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand-green shrink-0 mt-1.5" />
                    <span className="text-brand-muted text-sm leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              {/* Pay button */}
              <button
                onClick={() => handlePay(plan.id)}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white transition-all bg-[#1a3d2b] hover:bg-[#1f4d35] border border-green-900/60 hover:border-green-700"
              >
                Pay — KSh {plan.price.toLocaleString()}
              </button>
            </div>
          ))}
        </div>

        {/* ── Login nudge ── */}
        {!authLoading && !isAuthenticated && (
          <div className="mb-10 bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold mb-1">Login required to purchase</p>
              <p className="text-brand-muted text-sm">You need an account to buy VIP access. Free to create.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => router.push("/auth/login?redirect=/vip")}
                className="bg-brand-red hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/auth/signup?redirect=/vip")}
                className="border border-brand-border hover:border-gray-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* ── How it works ── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 mb-8">
          <h3 className="text-white font-black text-lg mb-6">How VIP Access works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Crown, title: "Choose a plan", body: "Pick Daily, Weekly, or Monthly — whichever fits your schedule and budget." },
              { icon: Zap, title: "Pay instantly", body: "Card or M-Pesa / Airtel Money. VIP access is activated the moment payment confirms." },
              { icon: CheckCircle, title: "Unlimited VIP tips", body: "Every premium prediction for the period is unlocked — no per-pick credits needed." },
            ].map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 text-xs font-black shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{title}</p>
                  <p className="text-brand-muted text-xs leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "Instant activation", body: "Access switches on the moment payment clears — no manual review, no waiting." },
            { icon: ShieldCheck, title: "Secure payments", body: "Processed via Paystack. M-Pesa & Airtel Money fully supported." },
            { icon: Clock, title: "No recurring charges", body: "We never auto-renew. You pay only when you choose to." },
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

      {showPayModal && selectedPkg && user?.email && (
        <PaymentMethodModal
          pkg={selectedPkg}
          email={user.email}
          callbackUrl={typeof window !== "undefined" ? `${window.location.origin}/vip` : "/vip"}
          onClose={() => { setShowPayModal(false); setPayingId(null); }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default function VipPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
        </div>
      }
    >
      <VipContent />
    </Suspense>
  );
}
