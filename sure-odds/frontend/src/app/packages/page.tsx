"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Zap, Star, Shield, CheckCircle, Loader2, AlertCircle,
  CreditCard, ArrowRight, Lock, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPackages, verifyPayment, fetchUserCredits } from "@/lib/api";
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

const PACKAGE_ICONS = [Zap, Star, Shield];
const PACKAGE_COLORS = ["text-brand-green", "text-brand-yellow", "text-brand-red"];
const PACKAGE_HIGHLIGHTS: Record<number, string[]> = {
  1: ["2 premium picks", "Full probability breakdown", "Confidence ratings included"],
  2: ["5 premium picks", "Full probability breakdown", "Best value — save 16%"],
  3: ["10 premium picks", "Full probability breakdown", "Lowest cost per pick"],
};

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

  useEffect(() => {
    fetchPackages()
      .then((pkgs: Package[]) => {
        setPackages(pkgs);
        if (pkgs.length > 0) setSelected(pkgs[0].id);
      })
      .catch(() => setError("Could not load packages. Please refresh."))
      .finally(() => setPkgsLoading(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserCredits()
        .then((c) => setCredits(c.remaining_picks))
        .catch(() => null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/packages");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleVerify = useCallback(
    async (ref: string) => {
      setVerifying(true);
      try {
        const data = await verifyPayment(ref);
        const url = new URL(window.location.href);
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.toString());
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

  const selectedPkg = packages.find((p) => p.id === selected);

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
          <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-full px-4 py-1.5 mb-4">
            <CreditCard className="w-3.5 h-3.5 text-brand-green" />
            <span className="text-brand-green text-xs font-bold uppercase tracking-wide">
              Value Packs
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
                        ? "border-brand-green bg-green-950/20 shadow-[0_0_0_1px_rgba(34,197,94,0.2)]"
                        : "border-brand-border bg-brand-card hover:border-gray-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            isSelected ? "bg-brand-green/20" : "bg-brand-dark"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", isSelected ? "text-brand-green" : color)} />
                        </div>
                        <div>
                          <p className={cn("font-bold text-sm", isSelected ? "text-white" : "text-brand-muted")}>
                            {pkg.name}
                          </p>
                          <p className="text-brand-muted text-xs">
                            {pkg.picks_count} premium picks
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-black text-xl", isSelected ? "text-brand-green" : "text-brand-muted")}>
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
                          <li key={item} className="flex items-center gap-2 text-xs text-brand-muted">
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
              className="w-full py-4 rounded-xl bg-brand-green hover:bg-green-600 disabled:opacity-60 text-black font-black text-base transition-colors flex items-center justify-center gap-2"
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
                    <span className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center text-black text-[10px] font-black shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-brand-muted text-xs leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />

      {showPayModal && selectedPkg && user?.email && (
        <PaymentMethodModal
          pkg={selectedPkg}
          email={user.email}
          callbackUrl={typeof window !== "undefined" ? `${window.location.origin}/packages` : "/packages"}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentSuccess}
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
          <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
        </div>
      }
    >
      <PackagesContent />
    </Suspense>
  );
}
