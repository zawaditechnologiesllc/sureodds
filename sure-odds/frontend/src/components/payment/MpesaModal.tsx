"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Phone, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { initializeMpesa, checkMpesaStatus } from "@/lib/api";
import toast from "react-hot-toast";

interface Package {
  id: number;
  name: string;
  price: number;
  picks_count: number;
  currency: string;
}

interface MpesaModalProps {
  pkg: Package;
  email: string;
  onClose: () => void;
  onSuccess: (picksAdded: number) => void;
}

type Stage = "form" | "waiting" | "success" | "failed";

const POLL_INTERVAL = 4000;
const POLL_MAX = 45;

export default function MpesaModal({ pkg, email, onClose, onSuccess }: MpesaModalProps) {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async (id: string, count: number) => {
    if (count >= POLL_MAX) {
      stopPolling();
      setStage("failed");
      setError("Payment timed out. If money was deducted, contact support.");
      return;
    }
    try {
      const data = await checkMpesaStatus(id, pkg.id);
      if (data.status === "COMPLETE") {
        stopPolling();
        setStage("success");
        toast.success(`✅ ${data.picks_added} credit${data.picks_added !== 1 ? "s" : ""} added!`);
        setTimeout(() => onSuccess(data.picks_added), 1200);
      } else if (data.status === "FAILED") {
        stopPolling();
        setStage("failed");
        setError(data.message || "M-Pesa payment failed or was cancelled.");
      }
    } catch {
      // ignore transient errors; keep polling
    }
  }, [pkg.id, stopPolling, onSuccess]);

  useEffect(() => {
    if (stage === "waiting" && invoiceId) {
      let count = 0;
      pollRef.current = setInterval(() => {
        count += 1;
        setPollCount(count);
        poll(invoiceId, count);
      }, POLL_INTERVAL);
    }
    return stopPolling;
  }, [stage, invoiceId, poll, stopPolling]);

  const handleSubmit = async () => {
    const cleaned = phone.trim().replace(/\s|-/g, "");
    if (!cleaned) {
      setError("Please enter your M-Pesa phone number.");
      return;
    }
    setError(null);
    setStage("waiting");
    try {
      const data = await initializeMpesa(pkg.id, cleaned, email);
      setInvoiceId(data.invoice_id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(msg || "Could not send M-Pesa prompt. Please try again.");
      setStage("form");
    }
  };

  const secondsLeft = Math.max(0, (POLL_MAX - pollCount) * (POLL_INTERVAL / 1000));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">M</span>
            </div>
            <span className="text-white font-black text-base">Pay with M-Pesa</span>
          </div>
          {stage !== "waiting" && (
            <button onClick={onClose} className="text-brand-muted hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Package info */}
          <div className="bg-brand-dark border border-brand-border rounded-lg px-4 py-3 mb-4">
            <p className="text-brand-muted text-xs mb-0.5">You are paying for</p>
            <p className="text-white font-bold text-sm">{pkg.name}</p>
            <p className="text-brand-green font-black text-xl mt-0.5">
              ${pkg.price.toFixed(2)}
            </p>
            <p className="text-brand-muted text-xs mt-0.5">Charged in KES via M-Pesa</p>
          </div>

          {/* Form stage */}
          {stage === "form" && (
            <>
              {error && (
                <div className="bg-red-950 border border-red-900 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                  <p className="text-brand-red text-sm">{error}</p>
                </div>
              )}
              <label className="text-white text-sm font-bold block mb-1.5">
                M-Pesa Phone Number
              </label>
              <div className="relative mb-4">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="07XX XXX XXX"
                  className="w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-border rounded-xl text-white text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-green transition-colors"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Send M-Pesa Prompt
              </button>
              <p className="text-brand-muted text-xs text-center mt-3">
                You will receive a prompt on your phone to enter your M-Pesa PIN.
              </p>
            </>
          )}

          {/* Waiting stage */}
          {stage === "waiting" && (
            <div className="text-center py-4">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
                <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
                <Phone className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
              </div>
              <p className="text-white font-bold text-base mb-1">Check your phone</p>
              <p className="text-brand-muted text-sm mb-3">
                Enter your M-Pesa PIN to complete payment.
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

          {/* Success stage */}
          {stage === "success" && (
            <div className="text-center py-4">
              <CheckCircle className="w-14 h-14 text-brand-green mx-auto mb-3" />
              <p className="text-white font-black text-lg mb-1">Payment confirmed!</p>
              <p className="text-brand-muted text-sm">
                Your pick credits have been added. Taking you to predictions...
              </p>
            </div>
          )}

          {/* Failed stage */}
          {stage === "failed" && (
            <div className="text-center py-4">
              <AlertCircle className="w-14 h-14 text-brand-red mx-auto mb-3" />
              <p className="text-white font-black text-base mb-2">Payment not confirmed</p>
              <p className="text-brand-muted text-sm mb-4">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStage("form"); setError(null); setPollCount(0); }}
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
