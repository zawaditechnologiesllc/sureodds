"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, CreditCard, Phone, Loader2, CheckCircle, AlertCircle, ArrowLeft, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  initializePayment,
  initializeMobileMoneyPaystack,
  checkMobileMoneyStatusPaystack,
} from "@/lib/api";

interface Package {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
}

interface PaymentMethodModalProps {
  pkg: Package;
  email: string;
  onClose: () => void;
  onSuccess: (picksAdded: number) => void;
  callbackUrl?: string;
}

type Screen =
  | "method-select"
  | "mobile-form"
  | "mobile-polling"
  | "success"
  | "failed";

const MOBILE_PROVIDERS = [
  {
    id: "mpesa",
    label: "M-Pesa",
    description: "Safaricom M-Pesa (Kenya)",
    color: "text-green-400",
    bg: "bg-green-950/40",
    border: "border-green-800",
    activeBorder: "border-green-500",
    icon: "M",
    iconBg: "bg-green-600",
  },
  {
    id: "airtel",
    label: "Airtel Money",
    description: "Airtel Money (Kenya)",
    color: "text-red-400",
    bg: "bg-red-950/40",
    border: "border-red-900",
    activeBorder: "border-red-500",
    icon: "A",
    iconBg: "bg-red-600",
  },
];

const POLL_INTERVAL = 4000;
const POLL_MAX = 45;

export default function PaymentMethodModal({
  pkg,
  email,
  onClose,
  onSuccess,
  callbackUrl,
}: PaymentMethodModalProps) {
  const [screen, setScreen] = useState<Screen>("method-select");
  const [provider, setProvider] = useState("mpesa");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [picksAdded, setPicksAdded] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (ref: string, count: number) => {
      if (count >= POLL_MAX) {
        stopPolling();
        setScreen("failed");
        setError("Payment timed out. If money was deducted, please contact support.");
        return;
      }
      try {
        const data = await checkMobileMoneyStatusPaystack(ref, pkg.id);
        if (data.status === "success") {
          stopPolling();
          setPicksAdded(data.picks_added ?? 0);
          setScreen("success");
          setTimeout(() => onSuccess(data.picks_added ?? 0), 1400);
        } else if (data.status === "failed") {
          stopPolling();
          setScreen("failed");
          setError(data.message || "Payment failed or was cancelled.");
        }
      } catch {
        // ignore transient errors; keep polling
      }
    },
    [pkg.id, stopPolling, onSuccess]
  );

  useEffect(() => {
    if (screen === "mobile-polling" && reference) {
      let count = 0;
      pollRef.current = setInterval(() => {
        count += 1;
        setPollCount(count);
        poll(reference, count);
      }, POLL_INTERVAL);
    }
    return stopPolling;
  }, [screen, reference, poll, stopPolling]);

  const handleCardPay = async () => {
    setLoading(true);
    setError(null);
    try {
      const cb = callbackUrl || `${window.location.origin}/packages`;
      const data = await initializePayment(pkg.id, email, cb);
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(msg || "Could not start payment. Please try again.");
      setLoading(false);
    }
  };

  const handleMobileSubmit = async () => {
    const cleaned = phone.trim().replace(/\s|-/g, "");
    if (!cleaned) {
      setError("Please enter your phone number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await initializeMobileMoneyPaystack(pkg.id, email, cleaned, provider);
      setReference(data.reference);
      setScreen("mobile-polling");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(msg || "Could not send payment prompt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const secondsLeft = Math.max(0, (POLL_MAX - pollCount) * (POLL_INTERVAL / 1000));
  const selectedProvider = MOBILE_PROVIDERS.find((p) => p.id === provider)!;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            {screen === "mobile-form" && (
              <button
                onClick={() => { setScreen("method-select"); setError(null); }}
                className="text-brand-muted hover:text-white transition-colors mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Lock className="w-4 h-4 text-brand-red" />
            <span className="text-white font-black text-base">
              {screen === "mobile-form"
                ? `Pay with ${selectedProvider.label}`
                : screen === "mobile-polling"
                ? "Awaiting Payment"
                : screen === "success"
                ? "Payment Confirmed"
                : screen === "failed"
                ? "Payment Failed"
                : "Choose Payment Method"}
            </span>
          </div>
          {screen !== "mobile-polling" && (
            <button
              onClick={onClose}
              className="text-brand-muted hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Package summary */}
          <div className="bg-brand-dark border border-brand-border rounded-lg px-4 py-3 mb-5">
            <p className="text-brand-muted text-xs mb-0.5">You are paying for</p>
            <p className="text-white font-bold text-sm">{pkg.name}</p>
            <p className="text-brand-green font-black text-xl mt-0.5">
              ${pkg.price.toFixed(2)}
            </p>
            <p className="text-brand-muted text-xs mt-0.5">
              {pkg.picks_count} premium picks · Charged in KES
            </p>
          </div>

          {/* Error banner */}
          {error && screen !== "failed" && (
            <div className="bg-red-950 border border-red-900 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
              <p className="text-brand-red text-sm">{error}</p>
            </div>
          )}

          {/* ── Method Selection ── */}
          {screen === "method-select" && (
            <div className="space-y-3">
              {/* Card via Paystack */}
              <button
                onClick={handleCardPay}
                disabled={loading}
                className="w-full text-left border border-brand-border hover:border-[#00C3F7]/60 bg-brand-dark rounded-xl p-4 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00C3F7]/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-[#00C3F7]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm group-hover:text-[#00C3F7] transition-colors">
                      Pay with Card
                    </p>
                    <p className="text-brand-muted text-xs">
                      Visa, Mastercard · Secured by Paystack
                    </p>
                  </div>
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-brand-muted animate-spin" />
                  ) : (
                    <span className="text-brand-muted text-xs">→</span>
                  )}
                </div>
              </button>

              {/* Mobile Money */}
              <button
                onClick={() => setScreen("mobile-form")}
                className="w-full text-left border border-brand-border hover:border-green-600/60 bg-brand-dark rounded-xl p-4 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-950/40 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm group-hover:text-green-400 transition-colors">
                      Pay with Mobile Money
                    </p>
                    <p className="text-brand-muted text-xs">
                      M-Pesa, Airtel Money · Instant STK push
                    </p>
                  </div>
                  <span className="text-brand-muted text-xs">→</span>
                </div>
              </button>

              <p className="text-center text-brand-muted text-xs pt-1">
                🔒 256-bit SSL · Powered by Paystack
              </p>
            </div>
          )}

          {/* ── Mobile Money Form ── */}
          {screen === "mobile-form" && (
            <>
              {/* Provider selection */}
              <div className="mb-4">
                <p className="text-brand-muted text-xs font-bold uppercase mb-2">Select Provider</p>
                <div className="grid grid-cols-2 gap-2">
                  {MOBILE_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                        provider === p.id
                          ? `${p.bg} ${p.activeBorder} border`
                          : "bg-brand-dark border-brand-border hover:border-gray-500"
                      )}
                    >
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                          p.iconBg
                        )}
                      >
                        <span className="text-white text-xs font-black">{p.icon}</span>
                      </div>
                      <div>
                        <p className={cn("text-xs font-bold", provider === p.id ? "text-white" : "text-brand-muted")}>
                          {p.label}
                        </p>
                        <p className="text-brand-muted text-[10px] leading-tight">{p.description.split("(")[1]?.replace(")", "") || ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone input */}
              <div className="mb-4">
                <label className="text-white text-sm font-bold block mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMobileSubmit()}
                    placeholder="07XX XXX XXX"
                    className="w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-white text-sm placeholder:text-brand-muted focus:outline-none focus:border-green-600 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleMobileSubmit}
                disabled={loading || !phone.trim()}
                className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending prompt...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Send {selectedProvider.label} Prompt
                  </>
                )}
              </button>
              <p className="text-brand-muted text-xs text-center mt-3">
                You will receive a payment prompt on your phone.
              </p>
            </>
          )}

          {/* ── Mobile Polling ── */}
          {screen === "mobile-polling" && (
            <div className="text-center py-4">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
                <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
                <Phone className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
              </div>
              <p className="text-white font-bold text-base mb-1">Check your phone</p>
              <p className="text-brand-muted text-sm mb-3">
                Enter your {selectedProvider.label} PIN to complete payment.
              </p>
              <div className="bg-brand-dark border border-brand-border rounded-lg px-4 py-2 inline-block">
                <p className="text-brand-muted text-xs">
                  Waiting{" "}
                  <span className="text-white font-bold">{Math.ceil(secondsLeft)}s</span>
                </p>
              </div>
              <p className="text-brand-muted text-xs mt-4">
                Do not close this window. Credits will be added automatically.
              </p>
            </div>
          )}

          {/* ── Success ── */}
          {screen === "success" && (
            <div className="text-center py-4">
              <CheckCircle className="w-14 h-14 text-brand-green mx-auto mb-3" />
              <p className="text-white font-black text-lg mb-1">Payment confirmed!</p>
              <p className="text-brand-muted text-sm">
                {picksAdded > 0
                  ? `${picksAdded} credit${picksAdded !== 1 ? "s" : ""} added to your account.`
                  : "Credits added to your account."}
              </p>
              <p className="text-brand-muted text-xs mt-2">Taking you to predictions...</p>
            </div>
          )}

          {/* ── Failed ── */}
          {screen === "failed" && (
            <div className="text-center py-4">
              <AlertCircle className="w-14 h-14 text-brand-red mx-auto mb-3" />
              <p className="text-white font-black text-base mb-2">Payment not confirmed</p>
              <p className="text-brand-muted text-sm mb-4">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setScreen("method-select");
                    setError(null);
                    setPollCount(0);
                    setReference(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold text-sm transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-brand-border text-brand-muted font-bold text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
