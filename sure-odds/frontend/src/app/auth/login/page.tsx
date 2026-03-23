"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Zap, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      router.push("/predictions");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-white font-black text-xl">
            SURE<span className="text-brand-red">ODDS</span>
          </span>
        </Link>

        <div className="bg-brand-card border border-brand-border rounded-xl p-6">
          <h1 className="text-white font-black text-xl mb-1">Welcome back</h1>
          <p className="text-brand-muted text-sm mb-6">Login to access today&apos;s picks</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-brand-muted text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-brand-red hover:text-red-400 font-bold">
                Get Started Free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
