"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, CreditCard, Phone, Loader2, CheckCircle, AlertCircle, ArrowLeft, Lock, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  initializePayment,
  initializeMpesa,
  checkMpesaStatus,
  purchaseBundle,
  initializeMpesaBundle,
  checkMpesaBundleStatus,
} from "@/lib/api";

interface Package {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
  duration_days?: number;
}

interface PaymentMethodModalProps {
  pkg: Package;
  email: string;
  onClose: () => void;
  onSuccess: (picksAdded: number) => void;
  callbackUrl?: string;
  priceLabel?: string;
  detailLabel?: string;
  successMessage?: string;
  /** Set to "bundle" when paying for a bundle; supply bundleId in that case. */
  mode?: "package" | "bundle";
  /** Required when mode === "bundle" */
  bundleId?: string;
}

type Screen =
  | "method-select"
  | "mobile-form"
  | "mobile-polling"
  | "success"
  | "failed";

// ---------------------------------------------------------------------------
// Country + provider config
// ---------------------------------------------------------------------------

interface Provider {
  id: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  activeBorder: string;
  icon: string;
  iconBg: string;
}

interface CountryEntry {
  name: string;
  flag: string;
  placeholder: string;
  currency: string;
  providers: Provider[];
}

const COUNTRIES: Record<string, CountryEntry> = {
  KE: {
    name: "Kenya",
    flag: "🇰🇪",
    placeholder: "07XX XXX XXX",
    currency: "KES",
    providers: [
      {
        id: "mpesa",
        label: "M-Pesa",
        desc: "Safaricom M-Pesa",
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
        desc: "Airtel Kenya",
        color: "text-red-400",
        bg: "bg-red-950/40",
        border: "border-red-900",
        activeBorder: "border-red-500",
        icon: "A",
        iconBg: "bg-red-600",
      },
    ],
  },
  TZ: {
    name: "Tanzania",
    flag: "🇹🇿",
    placeholder: "07XX XXX XXX",
    currency: "TZS",
    providers: [
      {
        id: "M-PESA",
        label: "M-Pesa TZ",
        desc: "Vodacom M-Pesa",
        color: "text-green-400",
        bg: "bg-green-950/40",
        border: "border-green-800",
        activeBorder: "border-green-500",
        icon: "M",
        iconBg: "bg-green-600",
      },
      {
        id: "AIRTEL-MONEY",
        label: "Airtel Money",
        desc: "Airtel Tanzania",
        color: "text-red-400",
        bg: "bg-red-950/40",
        border: "border-red-900",
        activeBorder: "border-red-500",
        icon: "A",
        iconBg: "bg-red-600",
      },
      {
        id: "TIGO-PESA",
        label: "Tigo Pesa",
        desc: "Tigo Tanzania",
        color: "text-blue-400",
        bg: "bg-blue-950/40",
        border: "border-blue-900",
        activeBorder: "border-blue-500",
        icon: "T",
        iconBg: "bg-blue-600",
      },
    ],
  },
  UG: {
    name: "Uganda",
    flag: "🇺🇬",
    placeholder: "07XX XXX XXX",
    currency: "UGX",
    providers: [
      {
        id: "MTN",
        label: "MTN MoMo",
        desc: "MTN Uganda",
        color: "text-yellow-400",
        bg: "bg-yellow-950/40",
        border: "border-yellow-900",
        activeBorder: "border-yellow-500",
        icon: "M",
        iconBg: "bg-yellow-600",
      },
      {
        id: "AIRTEL",
        label: "Airtel Money",
        desc: "Airtel Uganda",
        color: "text-red-400",
        bg: "bg-red-950/40",
        border: "border-red-900",
        activeBorder: "border-red-500",
        icon: "A",
        iconBg: "bg-red-600",
      },
    ],
  },
};

const COUNTRY_KEYS = Object.keys(COUNTRIES) as Array<keyof typeof COUNTRIES>;

const POLL_INTERVAL = 4000;
const POLL_MAX = 45;

function formatPriceLabel(pkg: Package, override?: string): string {
  if (override) return override;
  return pkg.currency === "KES"
    ? `KSh ${pkg.price.toLocaleString()}`
    : `$${pkg.price.toFixed(2)}`;
}

function formatDetailLabel(pkg: Package, override?: string): string {
  if (override) return override;
  if (pkg.picks_count > 0) return `${pkg.picks_count} premium picks · Charged in local currency`;
  if (pkg.duration_days) {
    const d = pkg.duration_days;
    return `${d === 1 ? "1 day" : d === 7 ? "7 days" : `${d} days`} VIP access`;
  }
  return "Charged in local currency";
}

export default function PaymentMethodModal({
  pkg,
  email,
  onClose,
  onSuccess,
  callbackUrl,
  priceLabel,
  detailLabel,
  successMessage,
  mode = "package",
  bundleId,
}: PaymentMethodModalProps) {
  const isBundle = mode === "bundle";

  const [screen, setScreen] = useState<Screen>("method-select");
  const [country, setCountry] = useState("KE");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [provider, setProvider] = useState(COUNTRIES.KE.providers[0].id);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [picksAdded, setPicksAdded] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const countryData = COUNTRIES[country] ?? COUNTRIES.KE;
  const selectedProvider = countryData.providers.find((p) => p.id === provider) ?? countryData.providers[0];

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (iid: string, count: number) => {
      if (count >= POLL_MAX) {
        stopPolling();
        setScreen("failed");
        setError("Payment timed out. If money was deducted, please contact support.");
        return;
      }
      try {
        let data;
        if (isBundle && bundleId) {
          data = await checkMpesaBundleStatus(iid, bundleId, country);
        } else {
          data = await checkMpesaStatus(iid, pkg.id, country);
        }
        const status = (data.status || "").toUpperCase();
        if (status === "COMPLETE") {
          stopPolling();
          const picks = data.picks_added ?? 0;
          setPicksAdded(picks);
          setScreen("success");
          setTimeout(() => onSuccess(picks), 1400);
        } else if (status === "FAILED") {
          stopPolling();
          setScreen("failed");
          setError(data.message || "Payment failed or was cancelled.");
        }
      } catch {
        // ignore transient errors — keep polling
      }
    },
    [isBundle, bundleId, pkg.id, country, stopPolling, onSuccess]
  );

  useEffect(() => {
    if (screen === "mobile-polling" && invoiceId) {
      let count = 0;
      pollRef.current = setInterval(() => {
        count += 1;
        setPollCount(count);
        poll(invoiceId, count);
      }, POLL_INTERVAL);
    }
    return stopPolling;
  }, [screen, invoiceId, poll, stopPolling]);

  const handleCountryChange = (code: string) => {
    setCountry(code);
    setProvider(COUNTRIES[code].providers[0].id);
    setShowCountryDropdown(false);
    setPhone("");
    setError(null);
  };

  const handleCardPay = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isBundle && bundleId) {
        const cb = callbackUrl || `${window.location.origin}/bundles`;
        const data = await purchaseBundle(bundleId, email, cb);
        window.location.href = data.authorization_url;
      } else {
        const cb = callbackUrl || `${window.location.origin}/packages`;
        const data = await initializePayment(pkg.id, email, cb);
        window.location.href = data.authorization_url;
      }
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
      const channelOverride = country === "KE" ? undefined : provider;
      let data;
      if (isBundle && bundleId) {
        data = await initializeMpesaBundle(bundleId, cleaned, email, country, channelOverride);
      } else {
        data = await initializeMpesa(pkg.id, cleaned, email, country, channelOverride);
      }
      setInvoiceId(data.invoice_id);
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

  const displayPrice = formatPriceLabel(pkg, priceLabel);
  const displayDetail = formatDetailLabel(pkg, detailLabel);
  const displaySuccess =
    successMessage ||
    (picksAdded > 0
      ? `${picksAdded} credit${picksAdded !== 1 ? "s" : ""} added to your account.`
      : "Your purchase was successful.");

  const secondsLeft = Math.max(0, (POLL_MAX - pollCount) * (POLL_INTERVAL / 1000));

  const headerTitle =
    screen === "mobile-form"
      ? `Pay with ${selectedProvider.label}`
      : screen === "mobile-polling"
      ? "Awaiting Payment"
      : screen === "success"
      ? "Payment Confirmed"
      : screen === "failed"
      ? "Payment Failed"
      : "Choose Payment Method";

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
            <span className="text-white font-black text-base">{headerTitle}</span>
          </div>
          {screen !== "mobile-polling" && (
            <button onClick={onClose} className="text-brand-muted hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Package / Bundle summary */}
          <div className="bg-brand-dark border border-brand-border rounded-lg px-4 py-3 mb-5">
            <p className="text-brand-muted text-xs mb-0.5">You are paying for</p>
            <p className="text-white font-bold text-sm">{pkg.name}</p>
            <p className="text-brand-green font-black text-xl mt-0.5">{displayPrice}</p>
            <p className="text-brand-muted text-xs mt-0.5">{displayDetail}</p>
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
                    <p className="text-brand-muted text-xs">Visa, Mastercard · Secured by Paystack</p>
                  </div>
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-brand-muted animate-spin" />
                  ) : (
                    <span className="text-brand-muted text-xs">→</span>
                  )}
                </div>
              </button>

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
                      M-Pesa, Airtel, MTN · Kenya, Tanzania, Uganda
                    </p>
                  </div>
                  <span className="text-brand-muted text-xs">→</span>
                </div>
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                {[
                  { icon: "🔒", label: "SSL Encrypted" },
                  { icon: "✓", label: "Instant Access" },
                  { icon: "🛡️", label: "Secure Checkout" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1 text-brand-muted text-[10px]">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-brand-muted text-[10px] pt-1">
                Powered by <span className="font-bold text-brand-red">SuperSport</span>
              </p>
            </div>
          )}

          {/* ── Mobile Money Form ── */}
          {screen === "mobile-form" && (
            <>
              {/* Country selector */}
              <div className="mb-4 relative">
                <p className="text-brand-muted text-xs font-bold uppercase mb-2">Your Country</p>
                <button
                  onClick={() => setShowCountryDropdown((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-white text-sm hover:border-gray-500 transition-colors"
                >
                  <span className="text-xl">{COUNTRIES[country].flag}</span>
                  <span className="flex-1 text-left font-bold">{COUNTRIES[country].name}</span>
                  <ChevronDown className={cn("w-4 h-4 text-brand-muted transition-transform", showCountryDropdown && "rotate-180")} />
                </button>
                {showCountryDropdown && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
                    {COUNTRY_KEYS.map((code) => (
                      <button
                        key={code}
                        onClick={() => handleCountryChange(code)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5",
                          country === code ? "text-white font-bold" : "text-brand-muted"
                        )}
                      >
                        <span className="text-xl">{COUNTRIES[code].flag}</span>
                        <span>{COUNTRIES[code].name}</span>
                        <span className="ml-auto text-xs text-brand-muted">{COUNTRIES[code].currency}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Provider selection */}
              <div className="mb-4">
                <p className="text-brand-muted text-xs font-bold uppercase mb-2">Select Provider</p>
                <div className={cn("grid gap-2", countryData.providers.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                  {countryData.providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                        provider === p.id
                          ? `${p.bg} ${p.activeBorder} border`
                          : "bg-brand-dark border-brand-border hover:border-gray-500"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", p.iconBg)}>
                        <span className="text-white text-xs font-black">{p.icon}</span>
                      </div>
                      <p className={cn("text-xs font-bold text-center leading-tight", provider === p.id ? "text-white" : "text-brand-muted")}>
                        {p.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone input */}
              <div className="mb-4">
                <label className="text-white text-sm font-bold block mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMobileSubmit()}
                    placeholder={countryData.placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-white text-sm placeholder:text-brand-muted focus:outline-none focus:border-green-600 transition-colors"
                  />
                </div>
                <p className="text-brand-muted text-[10px] mt-1">
                  Enter your {countryData.name} number in local format
                </p>
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

          {/* ── Polling ── */}
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
                  Waiting <span className="text-white font-bold">{Math.ceil(secondsLeft)}s</span>
                </p>
              </div>
              <p className="text-brand-muted text-xs mt-4">
                Do not close this window. Your purchase will activate automatically.
              </p>
            </div>
          )}

          {/* ── Success ── */}
          {screen === "success" && (
            <div className="text-center py-4">
              <CheckCircle className="w-14 h-14 text-brand-green mx-auto mb-3" />
              <p className="text-white font-black text-lg mb-1">Payment confirmed!</p>
              <p className="text-brand-muted text-sm">{displaySuccess}</p>
              <p className="text-brand-muted text-xs mt-2">Redirecting you now...</p>
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
                    setInvoiceId(null);
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
