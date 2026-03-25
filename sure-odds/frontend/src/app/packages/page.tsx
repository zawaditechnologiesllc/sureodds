"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import { Zap, Star, Shield, CheckCircle, Loader2, AlertCircle, CreditCard, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPackages, initializePayment, verifyPayment, fetchUserCredits } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import toast from "react-hot-toast";

interface Package {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
}

const PACKAGE_ICONS = [Zap, Star, Shield];
const PACKAGE_COLORS = ["text-brand-green", "text-brand-yellow", "text-brand-red"];
const PACKAGE_HIGHLIGHTS: Record<number, string[]> = {
  1: ["5 premium picks", "Full probability breakdown", "Confidence ratings included"],
  2: ["10 premium picks", "Full probability breakdown", "Best value for the week"],
  3: ["20 premium picks", "Full probability breakdown", "Lowest cost per pick"],
};

function PackagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/auth/login?redirect=/packages`);
    }
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgs, creds] = await Promise.allSettled([fetchPackages(), fetchUserCredits()]);
      if (pkgs.status === "fulfilled") {
        setPackages(pkgs.value);
        if (pkgs.value.length > 0) setSelected(pkgs.value[0].id);
      }
      if (creds.status === "fulfilled") setCredits(creds.value.remaining_picks);
    } catch {
      setError("Could not load packages. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  // Handle return from Paystack redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref && isAuthenticated) {
      setVerifying(true);
      verifyPayment(ref)
        .then((data) => {
          toast.success(`Payment confirmed! ${data.picks_added} picks added to your account.`);
          setCredits(data.picks_remaining);
          const url = new URL(window.location.href);
          url.searchParams.delete("reference");
          url.searchParams.delete("trxref");
          window.history.replaceState({}, "", url.toString());
        })
        .catch(() => {
          toast.error("Payment verification failed. Contact support if funds were deducted.");
        })
        .finally(() => setVerifying(false));
    }
  }, [searchParams, isAuthenticated]);

  const handleBuy = async () => {
    if (!selected || !user?.email) {
      setError("Could not determine your email. Please log out and back in.");
      return;
    }

    setPaying(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}/packages`;
      const data = await initializePayment(selected, user.email, callbackUrl);
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      setError(msg || "Could not start payment. Please try again.");
      setPaying(false);
    }
  };

  const selectedPkg = packages.find((p) => p.id === selected);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  // Not authenticated — show redirect message (router.replace will kick in)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-4 px-4">
        <Lock className="w-12 h-12 text-brand-muted" />
        <p className="text-white font-bold text-lg">Login required</p>
        <p className="text-brand-muted text-sm text-center">You need to be logged in to purchase pick credits.</p>
        <a href="/auth/login?redirect=/packages" className="bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          Login to Continue
        </a>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">Confirming your payment...</p>
          <p className="text-brand-muted text-sm mt-2">Please wait, do not close this page.</p>
        </div>
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
            <span className="text-brand-red text-xs font-bold uppercase tracking-wide">Pick Credits</span>
          </div>
          <h1 className="text-white font-black text-3xl mb-2">Buy Pick Credits</h1>
          <p className="text-brand-muted text-sm max-w-sm mx-auto">
            Purchase credits to unlock high-confidence predictions. Each credit unlocks one premium pick.
          </p>

          <div className="mt-3 text-xs text-brand-muted">
            Logged in as <span className="text-white font-medium">{user?.email}</span>
          </div>

          {credits !== null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-brand-card border border-brand-border rounded-xl px-5 py-3">
              <Zap className="w-4 h-4 text-brand-green" />
              <span className="text-white font-bold">{credits}</span>
              <span className="text-brand-muted text-sm">credits remaining</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-950 border border-red-900 rounded-xl p-4 flex items-center gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-brand-red shrink-0" />
                <p className="text-brand-red text-sm">{error}</p>
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
                        ? "border-brand-red bg-red-950/20"
                        : "border-brand-border bg-brand-card hover:border-gray-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isSelected ? "bg-brand-red/20" : "bg-brand-dark"
                        )}>
                          <Icon className={cn("w-5 h-5", isSelected ? "text-brand-red" : color)} />
                        </div>
                        <div>
                          <p className={cn("font-bold text-sm", isSelected ? "text-white" : "text-brand-muted")}>
                            {pkg.name}
                          </p>
                          <p className="text-brand-muted text-xs">{pkg.picks_count} premium picks</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-black text-xl", isSelected ? "text-white" : "text-brand-muted")}>
                          ${pkg.price.toFixed(2)}
                        </p>
                        <p className="text-brand-muted text-xs">
                          ${(pkg.price / pkg.picks_count).toFixed(3)} per pick
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

            {/* Pay Button — email pre-filled from auth */}
            <button
              onClick={handleBuy}
              disabled={paying || !selected}
              className="w-full py-4 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black text-base transition-colors flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting to Paystack...
                </>
              ) : (
                <>
                  Pay {selectedPkg ? `$${selectedPkg.price.toFixed(2)}` : ""} via Paystack
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Paystack trust badge */}
            <div className="mt-4 flex flex-col items-center gap-2 text-center">
              <p className="text-brand-muted text-xs">
                🔒 Secured by{" "}
                <a
                  href="https://paystack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#00C3F7] hover:underline"
                >
                  Paystack
                </a>
                {" "}· 256-bit SSL · No card details stored by SureOdds
              </p>
            </div>

            {/* How credits work */}
            <div className="mt-8 bg-brand-card border border-brand-border rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-3">How Pick Credits Work</h3>
              <div className="space-y-2.5">
                {[
                  "Buy a credit package above — 5, 10, or 20 picks",
                  "Credits are added instantly after payment confirmation",
                  "On the predictions page, tap any locked pick to unlock it with 1 credit",
                  "Credits never expire — use them at any time",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-brand-muted text-xs leading-relaxed">{step}</p>
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
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    }>
      <PackagesContent />
    </Suspense>
  );
}
