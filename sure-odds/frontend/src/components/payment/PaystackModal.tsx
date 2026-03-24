"use client";

import { useState, useEffect } from "react";
import { X, Lock, Zap, Star, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPaymentPlans, initializePayment, verifyPayment } from "@/lib/api";

interface Plan {
  id: string;
  label: string;
  amount: number;
  currency: string;
  picks: number;
  is_subscription: boolean;
}

interface PaystackModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  subscription: "Unlimited picks, every day",
  picks_2: "Try 2 premium picks now",
  picks_5: "Best value for the week",
  picks_10: "Power user bundle",
};

const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  subscription: ["Unlimited daily predictions", "High-confidence picks", "All leagues covered", "Cancel anytime"],
  picks_2: ["2 premium picks", "Valid until used", "Full probability breakdown"],
  picks_5: ["5 premium picks", "Valid until used", "Full probability breakdown"],
  picks_10: ["10 premium picks", "Valid until used", "Best per-pick price"],
};

export default function PaystackModal({ onClose, onSuccess }: PaystackModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string>("subscription");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRef, setPendingRef] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentPlans()
      .then(setPlans)
      .catch(() => setError("Could not load payment plans"));
  }, []);

  // Check for returning from Paystack redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (ref) {
      setPendingRef(ref);
      handleVerify(ref);
    }
  }, []);

  const handleVerify = async (ref: string) => {
    setVerifying(true);
    setError(null);
    try {
      await verifyPayment(ref);
      // Clean up URL
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
  };

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const data = await initializePayment(selected, callbackUrl);
      // Redirect to Paystack hosted payment page
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      setError(msg || "Could not initialize payment. Please try again.");
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selected);

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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-red" />
            <span className="text-white font-black text-lg">Unlock Premium Picks</span>
          </div>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-white transition-colors p-1"
          >
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
            Choose a plan to access all predictions with full probability breakdowns and confidence ratings.
          </p>

          {/* Plan Selection */}
          <div className="space-y-2 mb-5">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all",
                  selected === plan.id
                    ? "border-brand-red bg-red-950/30"
                    : "border-brand-border bg-brand-dark hover:border-gray-500"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {plan.is_subscription ? (
                      <Star className="w-4 h-4 text-brand-yellow fill-current" />
                    ) : (
                      <Zap className="w-4 h-4 text-brand-green" />
                    )}
                    <span className={cn(
                      "font-bold text-sm",
                      selected === plan.id ? "text-white" : "text-brand-muted"
                    )}>
                      {plan.label}
                    </span>
                    {plan.is_subscription && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-brand-yellow/20 text-brand-yellow rounded uppercase">
                        Best Value
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "font-black text-base",
                    selected === plan.id ? "text-white" : "text-brand-muted"
                  )}>
                    KES {plan.amount.toLocaleString()}
                    {plan.is_subscription && (
                      <span className="text-xs font-normal text-brand-muted">/mo</span>
                    )}
                  </span>
                </div>
                <p className="text-brand-muted text-xs ml-6">
                  {PLAN_DESCRIPTIONS[plan.id] || ""}
                </p>
              </button>
            ))}
          </div>

          {/* Plan highlights */}
          {selectedPlan && PLAN_HIGHLIGHTS[selected] && (
            <div className="bg-brand-dark border border-brand-border rounded-xl p-4 mb-5">
              <p className="text-brand-muted text-xs font-bold uppercase mb-2">What you get</p>
              <ul className="space-y-1.5">
                {PLAN_HIGHLIGHTS[selected].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={loading || !selectedPlan || plans.length === 0}
            className="w-full py-3.5 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black text-base transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to payment...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pay {selectedPlan ? `KES ${selectedPlan.amount.toLocaleString()}` : ""} via Paystack
              </>
            )}
          </button>

          <p className="text-center text-brand-muted text-xs mt-3">
            Secured by Paystack · 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}
