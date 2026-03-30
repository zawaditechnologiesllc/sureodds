"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Zap, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        setSessionError(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      toast.success("Password updated successfully!");
      setTimeout(() => router.push("/auth/login"), 2500);
    }
  };

  if (sessionError) {
    return (
      <div className="bg-brand-card border border-red-900 rounded-xl p-8 text-center">
        <AlertCircle className="w-10 h-10 text-brand-red mx-auto mb-3" />
        <h2 className="text-white font-black text-xl mb-2">Link Expired</h2>
        <p className="text-brand-muted text-sm mb-5">
          This password reset link has expired or is invalid. Please request a new one.
        </p>
        <Link
          href="/auth/login"
          className="inline-block bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition-colors text-sm"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-brand-card border border-green-900 rounded-xl p-8 text-center">
        <CheckCircle className="w-10 h-10 text-brand-green mx-auto mb-3" />
        <h2 className="text-white font-black text-xl mb-2">Password Updated</h2>
        <p className="text-brand-muted text-sm">Redirecting you to login...</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-6">
      <h1 className="text-white font-black text-xl mb-1">Set New Password</h1>
      <p className="text-brand-muted text-sm mb-6">
        Choose a strong password of at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min 8 characters"
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Confirm Password
          </label>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="Repeat your password"
            className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-brand-red text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
