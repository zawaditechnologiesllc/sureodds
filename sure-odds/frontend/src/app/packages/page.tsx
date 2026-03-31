"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Zap, Star, Shield, CheckCircle, Loader2, AlertCircle,
  CreditCard, ArrowRight, Lock, RefreshCw, Crown, CalendarDays, CalendarCheck, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPackages, verifyPayment, fetchUserCredits, fetchVipPackages, fetchVipStatus } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import toast from "react-hot-toast";
import PaymentMethodModal from "@/components/payment/PaymentMethodModal";

interface Package {
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

const PACKAGE_ICONS = [Zap, Star, Shield];
const PACKAGE_COLORS = ["text-brand-green", "text-brand-yellow", "text-brand-red"];
const PACKAGE_HIGHLIGHTS: Record<number, string[]> = {
  1: ["2 premium picks", "Full probability breakdown", "Confidence ratings included"],
  2: ["5 premium picks", "Full probability breakdown", "Best value — save 16%"],
  3: ["10 premium picks", "Full probability breakdown", "Lowest cost per pick"],
};

const VIP_ICONS = [Clock, CalendarDays, CalendarCheck];
const VIP_COLORS = ["from-green-600 to-emerald-700", "from-yellow-500 to-amber-600", "from-purple-600 to-violet-700"];
const VIP_BADGES = ["Daily", "Best Value", "Most Popular"];

function PackagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [pkgsLoading, setPkgsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // VIP
  const [vipPackages, setVipPackages] = useState<Package[]>([]);
  const [selectedVip, setSelectedVip] = useState<number | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [showVipPayModal, setShowVipPayModal] = useState(false);

  // Load packages eagerly — they're public
  useEffect(() => {
    fetchPackages()
      .then((pkgs: Package[]) => {
        setPackages(pkgs);
        if (pkgs.length > 0) setSelected(pkgs[0].id);
      })
      .catch(() => setError("Could not load packages. Please refresh."))
      .finally(() => setPkgsLoading(false));
    fetchVipPackages()
      .then((pkgs: Package[]) => {
        setVipPackages(pkgs);
        if (pkgs.length > 1) setSelectedVip(pkgs[1].id); // default to Weekly
      })
      .catch(() => null);
  }, []);

  // Load credits + VIP status once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserCredits()
        .then((c) => setCredits(c.remaining_picks))
        .catch(() => null);
      fetchVipStatus()
        .then(setVipStatus)
        .catch(() => null);
    }
  }, [isAuthenticated]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/packages");
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle return from Paystack redirect — verify immediately
  const handleVerify = useCallback(
    async (ref: string) => {
      setVerifying(true);
      try {
        const data = await verifyPayment(ref);
        // Strip reference from URL silently
        const url = new URL(window.location.href);
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.toString());
        // Handle both fresh success and already-verified (e.g. page refresh)
        const picksAdded = data.picks_added ?? 0;
        if (data.status === "already_verified") {
          toast.success("Payment already confirmed — your credits are ready!", { duration: 5000 });
        } else {
          toast.success(
            `✅ ${picksAdded} credit${picksAdded !== 1 ? "s" : ""} added! Go pick your matches.`,
            { duration: 5000 }
          );
        }
        router.push("/predictions?credits=added");
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
    if (!selected || !user?.email) {
      setError("Could not determine your email. Please log out and back in.");
      return;
    }
    setError(null);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = (picksAdded: number) => {
    setShowPayModal(false);
    toast.success(
      `✅ ${picksAdded} credit${picksAdded !== 1 ? "s" : ""} added! Go pick your matches.`,
      { duration: 5000 }
    );
    router.push("/predictions?credits=added");
  };

  const handleBuyVip = () => {
    if (!selectedVip || !user?.email) return;
    setShowVipPayModal(true);
  };

  const handleVipPaymentSuccess = (_picksAdded: number) => {
    setShowVipPayModal(false);
    toast.success("🏆 VIP Access activated! Enjoy your premium picks.", { duration: 6000 });
    fetchVipStatus().then(setVipStatus).catch(() => null);
    router.push("/predictions?vip=activated");
  };

  const selectedPkg = packages.find((p) => p.id === selected);
  const selectedVipPkg = vipPackages.find((p) => p.id === selectedVip);

  // Full-page verifying spinner
  if (verifying) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">Confirming your payment...</p>
          <p className="text-brand-muted text-sm mt-2">Hang on — adding credits to your account.</p>
        </div>
      </div>
    );
  }

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-4 px-4">
        <Lock className="w-12 h-12 text-brand-muted" />
        <p className="text-white font-bold text-lg">Login required</p>
        <p className="text-brand-muted text-sm text-center">
          You need to be logged in to purchase pick credits.
        </p>
        <a
          href="/auth/login?redirect=/packages"
          className="bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Login to Continue
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 rounded-full px-4 py-1.5 mb-4">
            <CreditCard className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-brand-red text-xs font-bold uppercase tracking-wide">
              Pick Credits
            </span>
          </div>
          <h1 className="text-white font-black text-3xl mb-2">Buy Pick Credits</h1>
          <p className="text-brand-muted text-sm max-w-sm mx-auto">
            Credits are added to your account the moment payment is confirmed. No waiting.
          </p>
          <div className="mt-3 text-xs text-brand-muted">
            Logged in as <span className="text-white font-medium">{user?.email}</span>
          </div>

          {credits !== null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-brand-card border border-brand-border rounded-xl px-5 py-3">
              <Zap className="w-4 h-4 text-brand-green" />
              <span className="text-white font-bold">{credits}</span>
              <span className="text-brand-muted text-sm">
                credit{credits !== 1 ? "s" : ""} remaining
              </span>
            </div>
          )}
        </div>

        {pkgsLoading ? (
          <div className="space-y-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-brand-border bg-brand-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-950 border border-red-900 rounded-xl p-4 flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-brand-red text-sm">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setPkgsLoading(true);
                      fetchPackages()
                        .then((pkgs) => {
                          setPackages(pkgs);
                          if (pkgs.length) setSelected(pkgs[0].id);
                        })
                        .catch(() => setError("Still can't load packages."))
                        .finally(() => setPkgsLoading(false));
                    }}
                    className="mt-2 text-brand-red text-xs flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Try again
                  </button>
                </div>
              </div>
            )}

            {/* Package Cards */}
            <div className="grid gap-3 mb-6">
              {packages.map((pkg, i) => {
                const Icon = PACKAGE_ICONS[i] || Zap;
                const color = PACKAGE_COLORS[i] || "text-white";
                const isSelected = selected === pkg.id;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelected(pkg.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-5 transition-all",
                      isSelected
                        ? "border-brand-red bg-red-950/20 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]"
                        : "border-brand-border bg-brand-card hover:border-gray-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            isSelected ? "bg-brand-red/20" : "bg-brand-dark"
                          )}
                        >
                          <Icon
                            className={cn("w-5 h-5", isSelected ? "text-brand-red" : color)}
                          />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "font-bold text-sm",
                              isSelected ? "text-white" : "text-brand-muted"
                            )}
                          >
                            {pkg.name}
                          </p>
                          <p className="text-brand-muted text-xs">
                            {pkg.picks_count} premium picks
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-black text-xl",
                            isSelected ? "text-white" : "text-brand-muted"
                          )}
                        >
                          ${pkg.price.toFixed(2)}
                        </p>
                        <p className="text-brand-muted text-xs">
                          ${(pkg.price / pkg.picks_count).toFixed(3)} / pick
                        </p>
                      </div>
                    </div>

                    {isSelected && PACKAGE_HIGHLIGHTS[pkg.id] && (
                      <ul className="space-y-1 mt-2 pt-3 border-t border-brand-border/50">
                        {PACKAGE_HIGHLIGHTS[pkg.id].map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 text-xs text-brand-muted"
                          >
                            <CheckCircle className="w-3 h-3 text-brand-green shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pay Button */}
            <button
              onClick={handleBuy}
              disabled={!selected}
              className="w-full py-4 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black text-base transition-colors flex items-center justify-center gap-2"
            >
              Pay {selectedPkg ? `$${selectedPkg.price.toFixed(2)}` : ""} — Get Instant Access
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-brand-muted text-xs mt-3">
              🔒 Card &amp; Mobile Money · Secured by{" "}
              <a
                href="https://paystack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#00C3F7] hover:underline"
              >
                Paystack
              </a>{" "}
              · Credits added instantly after payment
            </p>

            {/* How it works */}
            <div className="mt-8 bg-brand-card border border-brand-border rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-3">
                What happens after you pay?
              </h3>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Choose Card or Mobile Money (M-Pesa / Airtel Money)" },
                  { step: "2", text: "Card: Complete checkout on Paystack's secure page. Mobile Money: Approve the STK push on your phone." },
                  { step: "3", text: "Credits are verified and added to your account instantly" },
                  { step: "4", text: "You land on the predictions page with your new credits ready to use" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-brand-muted text-xs leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── VIP ACCESS SECTION ────────────────────────────────────────── */}
        <div className="mt-14 mb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">VIP Access</span>
            </div>
          </div>
          <h2 className="text-white font-black text-2xl mb-1">Unlock VIP Tips</h2>
          <p className="text-brand-muted text-sm mb-6">
            Get unlimited access to all daily VIP predictions for a fixed period. Pay once, enjoy all day.
          </p>

          {/* Active VIP banner */}
          {vipStatus?.is_active && (
            <div className="mb-6 flex items-center gap-3 bg-yellow-950/30 border border-yellow-600/30 rounded-xl p-4">
              <Crown className="w-6 h-6 text-yellow-400 shrink-0" />
              <div>
                <p className="text-yellow-300 font-bold text-sm">VIP Active — {vipStatus.package_name}</p>
                <p className="text-brand-muted text-xs mt-0.5">
                  Expires {vipStatus.expires_at ? new Date(vipStatus.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </div>
            </div>
          )}

          {vipPackages.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 mb-6">
                {vipPackages.map((pkg, i) => {
                  const Icon = VIP_ICONS[i] || CalendarDays;
                  const gradient = VIP_COLORS[i] || "from-gray-600 to-gray-700";
                  const badge = VIP_BADGES[i];
                  const isSelected = selectedVip === pkg.id;
                  let features: string[] = [];
                  try { features = JSON.parse(pkg.features || "[]"); } catch { features = []; }

                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedVip(pkg.id)}
                      className={cn(
                        "w-full text-left rounded-xl border-2 p-5 transition-all",
                        isSelected
                          ? "border-yellow-500 bg-yellow-950/20 shadow-[0_0_0_1px_rgba(234,179,8,0.2)]"
                          : "border-brand-border bg-brand-card hover:border-yellow-600/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={cn("font-bold text-sm", isSelected ? "text-white" : "text-brand-muted")}>
                                {pkg.name}
                              </p>
                              {badge && i === 2 && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 uppercase">
                                  {badge}
                                </span>
                              )}
                              {badge && i === 1 && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 uppercase">
                                  {badge}
                                </span>
                              )}
                            </div>
                            <p className="text-brand-muted text-xs">
                              {pkg.duration_days === 1 ? "1 day access" : pkg.duration_days === 7 ? "7 days access" : "30 days access"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("font-black text-xl", isSelected ? "text-yellow-400" : "text-brand-muted")}>
                            KSh {pkg.price.toLocaleString()}
                          </p>
                          {pkg.duration_days && pkg.duration_days > 1 && (
                            <p className="text-brand-muted text-xs">
                              KSh {Math.round(pkg.price / pkg.duration_days)}/day
                            </p>
                          )}
                        </div>
                      </div>

                      {features.length > 0 && (
                        <ul className="mt-3 pt-3 border-t border-brand-border/40 space-y-1.5">
                          {features.map((f: string) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-brand-muted">
                              <CheckCircle className="w-3 h-3 text-yellow-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleBuyVip}
                disabled={!selectedVip}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-60 text-black font-black text-base transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Crown className="w-5 h-5" />
                Pay KSh {selectedVipPkg ? selectedVipPkg.price.toLocaleString() : "—"} — Get VIP Access
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center text-brand-muted text-xs mt-3">
                🔒 Card &amp; Mobile Money · Secured by Paystack · Access activated instantly after payment
              </p>
            </>
          )}
        </div>
        {/* ─── END VIP SECTION ───────────────────────────────────────────── */}
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />

      {/* Payment method modal — credits */}
      {showPayModal && selectedPkg && user?.email && (
        <PaymentMethodModal
          pkg={selectedPkg}
          email={user.email}
          callbackUrl={typeof window !== "undefined" ? `${window.location.origin}/packages` : "/packages"}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Payment method modal — VIP */}
      {showVipPayModal && selectedVipPkg && user?.email && (
        <PaymentMethodModal
          pkg={selectedVipPkg}
          email={user.email}
          callbackUrl={typeof window !== "undefined" ? `${window.location.origin}/packages` : "/packages"}
          onClose={() => setShowVipPayModal(false)}
          onSuccess={handleVipPaymentSuccess}
        />
      )}
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
      }
    >
      <PackagesContent />
    </Suspense>
  );
}
