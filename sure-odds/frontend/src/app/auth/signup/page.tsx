"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Zap, Eye, EyeOff, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const PERKS = [
  "Unlock all daily predictions",
  "Confidence ratings & probabilities",
  "Multi-market picks (1X2, Over 2.5, BTTS)",
  "Email alerts for top picks",
];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { ref_code: refCode },
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to verify.");
      router.push("/predictions");
    }
    setLoading(false);
  };

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

        <div className="bg-brand-card border border-brand-border rounded-xl p-6">
          <h1 className="text-white font-black text-xl mb-1">Get Started Free</h1>
          <p className="text-brand-muted text-sm mb-4">Create your account to unlock predictions</p>

          {/* Perks */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-3 mb-5 space-y-1.5">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" />
                <span className="text-gray-300 text-xs">{perk}</span>
              </div>
            ))}
          </div>

          {refCode && (
            <div className="bg-yellow-950 border border-yellow-900 text-brand-yellow text-xs font-bold px-3 py-2 rounded-lg mb-4">
              Referred by: {refCode}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min 8 characters"
                  minLength={8}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black py-3 rounded-lg transition-colors"
            >
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-brand-muted text-xs mb-3">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-brand-red hover:text-red-400 font-bold">
                Login
              </Link>
            </p>
            <p className="text-brand-muted text-[10px]">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
