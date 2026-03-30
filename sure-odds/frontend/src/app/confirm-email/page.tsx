"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Zap, CheckCircle, Loader2, AlertCircle, Mail } from "lucide-react";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (token_hash && type) {
      setStatus("loading");
      supabase.auth
        .verifyOtp({ token_hash, type: type as any })
        .then(({ error }) => {
          if (error) {
            setStatus("error");
            setMessage(error.message);
          } else {
            setStatus("success");
            setTimeout(() => router.push("/predictions"), 3000);
          }
        });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setStatus("success");
          setTimeout(() => router.push("/predictions"), 3000);
        }
      });
    }
  }, [searchParams, router]);

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-10 h-10 text-brand-red animate-spin mx-auto mb-4" />
          <h2 className="text-white font-black text-xl mb-2">Confirming your email...</h2>
          <p className="text-brand-muted text-sm">Please wait.</p>
        </>
      )}

      {status === "pending" && (
        <>
          <Mail className="w-10 h-10 text-brand-muted mx-auto mb-4" />
          <h2 className="text-white font-black text-xl mb-2">Check Your Email</h2>
          <p className="text-brand-muted text-sm max-w-xs mx-auto mb-5">
            We sent a confirmation link to your email address. Click the link to activate your
            account and start accessing predictions.
          </p>
          <p className="text-brand-muted text-xs">
            Already confirmed?{" "}
            <Link href="/auth/login" className="text-brand-red hover:text-red-400 font-bold">
              Login here
            </Link>
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="w-10 h-10 text-brand-green mx-auto mb-4" />
          <h2 className="text-white font-black text-xl mb-2">Email Confirmed!</h2>
          <p className="text-brand-muted text-sm mb-5">
            Your account is now active. Redirecting you to predictions...
          </p>
          <Link
            href="/predictions"
            className="inline-block bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Go to Predictions
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="w-10 h-10 text-brand-red mx-auto mb-4" />
          <h2 className="text-white font-black text-xl mb-2">Confirmation Failed</h2>
          <p className="text-brand-muted text-sm mb-2">
            {message || "The link may be expired or already used."}
          </p>
          <p className="text-brand-muted text-xs mb-5">
            Please try signing up again or contact{" "}
            <a href="mailto:info@sureodds.pro" className="text-brand-red hover:text-red-400">
              info@sureodds.pro
            </a>
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Try Again
          </Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-white font-black text-xl">
            SURE<span className="text-brand-red">ODDS</span>
          </span>
        </Link>

        <Suspense
          fallback={
            <div className="bg-brand-card border border-brand-border rounded-xl p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            </div>
          }
        >
          <ConfirmEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
