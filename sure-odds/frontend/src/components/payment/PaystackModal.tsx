"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Lock, Zap, Star, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPackages, initializePayment, verifyPayment } from "@/lib/api";

interface Package {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
}

interface PaystackModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PACKAGE_HIGHLIGHTS: Record<number, string[]> = {
  1: ["2 premium picks", "Full probability breakdown", "Confidence ratings"],
  2: ["5 premium picks", "Full probability breakdown", "Best value"],
  3: ["10 premium picks", "Full probability breakdown", "Lowest cost per pick"],
};

export default function PaystackModal({ onClose, onSuccess }: PaystackModalProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages()
      .then((pkgs: Package[]) => {
        setPackages(pkgs);
        if (pkgs.length > 0) setSelected(pkgs[0].id);
      })
      .catch(() => setError("Could not load packages. Please try again."));
  }, []);

  const handleVerify = useCallback(async (ref: string) => {
    setVerifying(true);
    setError(null);
    try {
      await verifyPayment(ref);
      const url = new URL(window.location.href);
      url.searchParams.delete("reference");
      url.searchParams.delete("trxref");
      window.history.replaceState({}, "", url.toString());
      onSuccess();
    } catch {
      setError("Payment verification failed. Please contact support if funds were deducted.");
    } finally {
      setVerifying(false);
    }
  }, [onSuccess]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (ref) handleVerify(ref);
  }, [handleVerify]);

  const handlePay = async () => {
    if (!selected || !email) {
      setError("Please select a package and enter your email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const data = await initializePayment(selected, email, callbackUrl);
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      setError(msg || "Could not initialize payment. Please try again.");
      setLoading(false);
    }
  };

  const selectedPkg = packages.find((p) => p.id === selected);

  if (verifying) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-brand-red animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg mb-1">Verifying payment...</p>
          <p className="text-brand-muted text-sm">Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-red" />
            <span className="text-white font-black text-lg">Buy Pick Credits</span>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="bg-red-950 border border-red-900 rounded-lg p-3 mb-4 text-brand-red text-sm">
              {error}
            </div>
          )}

          <p className="text-brand-muted text-sm mb-4">
            Purchase credits to unlock premium predictions with full probability breakdowns.
          </p>

          <div className="space-y-2 mb-4">
            {packages.map((pkg, i) => (
              <button
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all",
                  selected === pkg.id
                    ? "border-brand-red bg-red-950/30"
                    : "border-brand-border bg-brand-dark hover:border-gray-500"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {i === 1 ? (
                      <Star className="w-4 h-4 text-brand-yellow fill-current" />
                    ) : (
                      <Zap className="w-4 h-4 text-brand-green" />
                    )}
                    <span className={cn("font-bold text-sm", selected === pkg.id ? "text-white" : "text-brand-muted")}>
                      {pkg.name}
                    </span>
                  </div>
                  <span className={cn("font-black text-base", selected === pkg.id ? "text-white" : "text-brand-muted")}>
                    KES {pkg.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-brand-muted text-xs ml-6">{pkg.picks_count} picks · KES {(pkg.price / pkg.picks_count).toFixed(0)} per pick</p>
              </button>
            ))}
          </div>

          {selectedPkg && PACKAGE_HIGHLIGHTS[selectedPkg.id] && (
            <div className="bg-brand-dark border border-brand-border rounded-xl p-4 mb-4">
              <p className="text-brand-muted text-xs font-bold uppercase mb-2">What you get</p>
              <ul className="space-y-1.5">
                {PACKAGE_HIGHLIGHTS[selectedPkg.id].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4">
            <label className="text-white text-sm font-bold block mb-1.5">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red transition-colors"
            />
          </div>

          <button
            onClick={handlePay}
            disabled={loading || !selectedPkg || !email}
            className="w-full py-3.5 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black text-base transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Paystack...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pay {selectedPkg ? `KES ${selectedPkg.price.toLocaleString()}` : ""} via Paystack
              </>
            )}
          </button>

          <p className="text-center text-brand-muted text-xs mt-3">
            Secured by{" "}
            <a href="https://paystack.com" target="_blank" rel="noopener noreferrer" className="font-bold text-[#00C3F7]">
              Paystack
            </a>
            {" "}· 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}
