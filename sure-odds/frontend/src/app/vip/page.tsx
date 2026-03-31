"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Crown, CheckCircle, Loader2, Lock, ArrowRight,
  Clock, CalendarDays, CalendarCheck, Zap,
} from "lucide-react";
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

const PLAN_META = [
  {
    icon: Clock,
    gradient: "from-green-600 to-emerald-700",
    durationLabel: "1 day access",
    badge: null,
  },
  {
    icon: CalendarDays,
    gradient: "from-yellow-500 to-amber-600",
    durationLabel: "7 days access",
    badge: "Best Value",
  },
  {
    icon: CalendarCheck,
    gradient: "from-purple-600 to-violet-700",
    durationLabel: "30 days access",
    badge: "Most Popular",
  },
];

function VipContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [vipPackages, setVipPackages] = useState<VipPackage[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchVipPackages()
      .then((pkgs: VipPackage[]) => {
        setVipPackages(pkgs);
        if (pkgs.length > 1) setSelected(pkgs[1].id);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
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

  const handleBuy = () => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/vip");
      return;
    }
    setShowPayModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayModal(false);
    toast.success("🏆 VIP Access activated! Enjoy your premium picks.", { duration: 6000 });
    fetchVipStatus().then(setVipStatus).catch(() => null);
    router.push("/predictions?vip=activated");
  };

  const selectedPkg = vipPackages.find((p) => p.id === selected);

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

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-4">
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">VIP Access</span>
          </div>
          <h1 className="text-white font-black text-4xl md:text-5xl mb-4 leading-tight">
            Unlock Premium VIP Tips
          </h1>
          <p className="text-brand-muted text-base max-w-lg mx-auto">
            Get unlimited access to all daily VIP predictions for a fixed period. Pay once — no credits needed, no limits.
          </p>
        </div>

        {/* Active VIP Banner */}
        {vipStatus?.is_active && (
          <div className="mb-8 flex items-center gap-4 bg-yellow-950/30 border border-yellow-600/30 rounded-2xl p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <p className="text-yellow-300 font-black text-base">VIP Active — {vipStatus.package_name}</p>
              <p className="text-brand-muted text-sm mt-0.5">
                Expires{" "}
                {vipStatus.expires_at
                  ? new Date(vipStatus.expires_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
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

        {/* VIP Plan Cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {vipPackages.map((pkg, i) => {
              const meta = PLAN_META[i] || PLAN_META[0];
              const Icon = meta.icon;
              const isSelected = selected === pkg.id;
              let features: string[] = [];
              try { features = JSON.parse(pkg.features || "[]"); } catch { features = []; }

              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col text-left transition-all ${
                    isSelected
                      ? "border-yellow-500 bg-yellow-950/20 shadow-[0_0_24px_rgba(234,179,8,0.12)]"
                      : "border-brand-border bg-brand-card hover:border-yellow-700/50"
                  }`}
                >
                  {meta.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border whitespace-nowrap ${
                        meta.badge === "Best Value"
                          ? "bg-yellow-950/60 text-yellow-400 border-yellow-500/40"
                          : "bg-purple-950/60 text-purple-400 border-purple-500/40"
                      }`}>
                        {meta.badge}
                      </span>
                    </div>
                  )}

                  {/* Title + price row */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className={`font-black text-lg leading-none mb-1 ${isSelected ? "text-white" : "text-gray-300"}`}>
                        {pkg.name}
                      </p>
                      <p className="text-brand-muted text-xs">{meta.durationLabel}</p>
                    </div>
                    <div className={`text-right shrink-0 ml-3`}>
                      <p className={`font-black text-2xl leading-none ${isSelected ? "text-yellow-400" : "text-gray-300"}`}>
                        KSh {pkg.price.toLocaleString()}
                      </p>
                      {pkg.duration_days && pkg.duration_days > 1 && (
                        <p className="text-brand-muted text-[11px] mt-0.5">
                          KSh {Math.round(pkg.price / pkg.duration_days)}/day
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Plan icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 flex-1 mb-6">
                    {features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-white text-sm leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pay button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(pkg.id);
                      if (!isAuthenticated) {
                        router.push("/auth/login?redirect=/vip");
                        return;
                      }
                      setShowPayModal(true);
                    }}
                    className="w-full py-3.5 rounded-xl font-black text-sm transition-all bg-gradient-to-r from-[#1a3a2a] to-[#1f4d35] hover:from-[#1f4d35] hover:to-[#266040] text-white border border-green-900/60 hover:border-green-700/60"
                  >
                    Pay — KSh {pkg.price.toLocaleString()}
                  </button>
                </button>
              );
            })}
          </div>
        )}

        {/* Login nudge for unauthenticated */}
        {!authLoading && !isAuthenticated && (
          <div className="mb-10 bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-brand-muted shrink-0" />
              <div>
                <p className="text-white font-bold">Login to unlock VIP access</p>
                <p className="text-brand-muted text-sm">You need an account to purchase VIP tips. It takes 30 seconds.</p>
              </div>
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

        {/* How it works */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 mb-8">
          <h3 className="text-white font-black text-lg mb-5">How VIP Access works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: Crown, title: "Choose a plan", body: "Pick Daily, Weekly, or Monthly — whichever fits your betting schedule." },
              { step: "2", icon: Zap, title: "Pay instantly", body: "Card or Mobile Money (M-Pesa / Airtel). Access is activated the moment payment clears." },
              { step: "3", icon: CheckCircle, title: "Enjoy all VIP tips", body: "Every VIP prediction for the period is unlocked — no credit needed, no limits." },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 text-xs font-black shrink-0 mt-0.5">
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

        {/* Trust row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Instant activation", body: "VIP access is switched on immediately after payment — no waiting, no manual review." },
            { title: "Secure payments", body: "All payments processed securely through Paystack. M-Pesa & Airtel Money supported." },
            { title: "Data-driven picks", body: "Every VIP prediction is generated from real statistical models, not guesswork." },
          ].map(({ title, body }) => (
            <div key={title} className="bg-brand-card border border-brand-border rounded-xl p-5 text-center">
              <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed">{body}</p>
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
          onClose={() => setShowPayModal(false)}
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
