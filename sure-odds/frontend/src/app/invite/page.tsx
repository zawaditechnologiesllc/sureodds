"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Zap, CheckCircle, Users, Gift, Loader2, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api-proxy";

const PERKS = [
  "2 free predictions every day — no card needed",
  "Full AI confidence ratings & probability breakdowns",
  "Access to Bundles — AI-built betting combos",
  "Track your picks against real results",
];

function InviteContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.toUpperCase() ?? "";

  const [valid, setValid] = useState<boolean | null>(null);
  const [signupUrl, setSignupUrl] = useState<string>(`/auth/signup`);

  useEffect(() => {
    if (!code) {
      setValid(false);
      return;
    }
    fetch(`${API_URL}/partners/invite/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setSignupUrl(`/auth/signup?ref=${code}`);
          // Track the click for partner analytics
          fetch(`${API_URL}/partner-dashboard/track-click`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referral_code: code }),
          }).catch(() => null);
        } else {
          setValid(false);
        }
      })
      .catch(() => {
        setValid(false);
      });
  }, [code]);

  if (!code || valid === false) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-brand-card border border-brand-border rounded-xl p-8 mb-6">
          <AlertCircle className="w-10 h-10 text-brand-muted mx-auto mb-4" />
          <h2 className="text-white font-black text-xl mb-2">Invalid Invite Link</h2>
          <p className="text-brand-muted text-sm mb-5">
            This invite link is invalid or has expired. You can still sign up for a free account
            without an invite.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-brand-red hover:bg-red-700 text-white font-black px-6 py-3 rounded-lg transition-colors"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    );
  }

  if (valid === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-red/20 to-transparent border-b border-brand-border px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-red/20 border border-brand-red/30 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <p className="text-brand-muted text-xs font-bold uppercase tracking-widest">
                You&apos;re Invited
              </p>
              <p className="text-white font-black text-lg leading-tight">
                Join Sure Odds Free
              </p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            A partner has invited you to Sure Odds — the AI-powered football prediction platform
            trusted across Europe and beyond.
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-brand-muted text-xs font-bold uppercase tracking-widest mb-3">
            What you get
          </p>
          <ul className="space-y-2.5 mb-6">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">{perk}</span>
              </li>
            ))}
          </ul>

          <div className="bg-brand-dark border border-brand-border rounded-lg px-4 py-3 flex items-center gap-3 mb-5">
            <Users className="w-4 h-4 text-brand-muted shrink-0" />
            <p className="text-brand-muted text-xs">
              Invite code: <span className="text-white font-bold font-mono">{code}</span>
            </p>
          </div>

          <Link
            href={signupUrl}
            className="block w-full text-center bg-brand-red hover:bg-red-700 text-white font-black px-6 py-3.5 rounded-lg transition-colors text-base"
          >
            Create Free Account
          </Link>

          <p className="text-center text-brand-muted text-xs mt-4">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-red hover:text-red-400 font-bold">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-brand-muted text-[11px] mt-4">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="hover:text-white transition-colors">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:text-white transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4 py-12">
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
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
          </div>
        }
      >
        <InviteContent />
      </Suspense>

      <p className="text-brand-muted text-xs mt-8">
        © {new Date().getFullYear()} SureOdds — Bucharest, Romania
      </p>
    </div>
  );
}
