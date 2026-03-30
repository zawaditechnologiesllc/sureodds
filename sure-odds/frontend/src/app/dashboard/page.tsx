"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Zap, CreditCard, TrendingUp, CheckCircle, Lock, BarChart2,
  Star, Loader2, ArrowRight, Gift, Users
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { fetchUserCredits, fetchPaymentStatus } from "@/lib/api";

interface PaymentStatus {
  is_paid: boolean;
  subscription_status: string;
  picks_remaining: number;
  can_access_premium: boolean;
}

function DashboardContent() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [status, creds] = await Promise.allSettled([
        fetchPaymentStatus(),
        fetchUserCredits(),
      ]);
      if (status.status === "fulfilled") setPaymentStatus(status.value);
      if (creds.status === "fulfilled") setCredits(creds.value.remaining_picks ?? 0);
    } catch {
      /* silently fail — show zeros */
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-4 px-4">
        <Lock className="w-12 h-12 text-brand-muted" />
        <p className="text-white font-bold text-lg">Login required</p>
        <Link href="/auth/login?redirect=/dashboard" className="bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          Login to Continue
        </Link>
      </div>
    );
  }

  const isPaid = paymentStatus?.is_paid ?? false;
  const username = user?.email?.split("@")[0] ?? "User";
  const subscriptionLabel = isPaid ? "Premium" : "Free";

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome Header */}
        <div className="mb-8">
          <p className="text-brand-muted text-sm mb-1">Welcome back,</p>
          <h1 className="text-white font-black text-3xl">{username}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              isPaid
                ? "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30"
                : "bg-brand-card text-brand-muted border-brand-border"
            }`}>
              {subscriptionLabel} Plan
            </span>
            <span className="text-brand-muted text-xs">{user?.email}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Pick Credits",
              value: dataLoading ? "—" : credits.toString(),
              icon: Zap,
              color: "text-brand-green",
              bg: "bg-green-950/20",
              border: "border-green-900/30",
            },
            {
              label: "Plan",
              value: dataLoading ? "—" : subscriptionLabel,
              icon: Star,
              color: "text-brand-yellow",
              bg: "bg-yellow-950/20",
              border: "border-yellow-900/30",
            },
            {
              label: "Predictions",
              value: isPaid ? "Unlimited" : "2/day",
              icon: BarChart2,
              color: "text-brand-muted",
              bg: "bg-brand-dark",
              border: "border-brand-border",
            },
            {
              label: "Status",
              value: isPaid ? "Active" : "Free",
              icon: CheckCircle,
              color: isPaid ? "text-brand-green" : "text-brand-muted",
              bg: isPaid ? "bg-green-950/20" : "bg-brand-dark",
              border: isPaid ? "border-green-900/30" : "border-brand-border",
            },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-brand-muted text-xs font-medium">{label}</span>
              </div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Buy Credits Card */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-brand-green" />
              <h2 className="text-white font-black text-lg">Buy Pick Credits</h2>
            </div>
            <p className="text-brand-muted text-sm mb-5">
              No subscription needed. Buy credits and unlock individual high-confidence picks on demand.
            </p>

            <div className="space-y-2 mb-5">
              {[
                { label: "Starter — 2 picks", price: "$2.99", tag: null },
                { label: "Value Pack — 5 picks", price: "$4.99", tag: "Popular" },
                { label: "Pro Bundle — 10 picks", price: "$8.99", tag: null },
              ].map(({ label, price, tag }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-brand-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-brand-green" />
                    <span className="text-white text-sm">{label}</span>
                    {tag && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded">
                        {tag}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-bold text-sm">{price}</span>
                </div>
              ))}
            </div>

            <Link
              href="/packages"
              className="w-full py-3 rounded-xl bg-brand-green hover:bg-green-600 text-black font-black text-sm text-center transition-colors flex items-center justify-center gap-2"
            >
              Buy Credits Now
              <ArrowRight className="w-4 h-4" />
            </Link>

            {credits > 0 && (
              <p className="text-center text-brand-green text-xs mt-3 font-bold">
                You have {credits} credit{credits !== 1 ? "s" : ""} ready to use
              </p>
            )}
          </div>

          {/* Upgrade Card (shown for free users) / Plan details (for paid) */}
          {!isPaid ? (
            <div className="bg-gradient-to-b from-yellow-950/30 to-brand-card border border-brand-yellow/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-brand-yellow fill-current" />
                <h2 className="text-white font-black text-lg">Upgrade to Premium</h2>
              </div>
              <p className="text-brand-muted text-sm mb-4">
                Get unlimited daily predictions with full probability breakdowns, confidence badges, and multi-market analysis.
              </p>

              <div className="space-y-2 mb-5">
                {[
                  "Unlimited predictions every day",
                  "Full 1X2, Over 2.5 & BTTS markets",
                  "High / Medium / Low confidence badges",
                  "Email alerts for top picks",
                  "Priority support",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
                    <span className="text-white text-sm">{f}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/pricing"
                className="w-full py-3 rounded-xl bg-brand-yellow hover:bg-yellow-500 text-black font-black text-sm text-center transition-colors block"
              >
                See Plans — from $9.99/mo
              </Link>
            </div>
          ) : (
            <div className="bg-gradient-to-b from-green-950/20 to-brand-card border border-brand-green/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-brand-green" />
                <h2 className="text-white font-black text-lg">Premium Active</h2>
              </div>
              <p className="text-brand-muted text-sm mb-4">
                You have unlimited access to all predictions, confidence ratings, and multi-market picks.
              </p>
              <div className="space-y-2">
                {["Unlimited predictions", "All markets unlocked", "Priority support"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    <span className="text-white text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
            <h2 className="text-white font-black text-lg mb-4">Quick Links</h2>
            <div className="space-y-2">
              {[
                { href: "/predictions", label: "Today's Predictions", icon: BarChart2, color: "text-brand-red" },
                { href: "/results", label: "Results & Track Record", icon: TrendingUp, color: "text-brand-green" },
                { href: "/pricing", label: "View All Plans", icon: Star, color: "text-brand-yellow" },
                { href: "/partner", label: "Earn 30% — Affiliate Program", icon: Gift, color: "text-brand-muted" },
              ].map(({ href, label, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 py-2.5 border-b border-brand-border last:border-0 hover:text-white group transition-colors"
                >
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <span className="text-brand-muted group-hover:text-white text-sm transition-colors">{label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-border group-hover:text-brand-muted ml-auto transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Referral Teaser */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-brand-muted" />
              <h2 className="text-white font-black text-lg">Earn with Referrals</h2>
            </div>
            <p className="text-brand-muted text-sm mb-4">
              Share your referral link and earn 30% commission on every referred subscription — forever.
            </p>
            <Link
              href="/partner"
              className="w-full py-3 rounded-xl border border-brand-border text-white font-bold text-sm text-center transition-colors hover:bg-brand-card block"
            >
              Start Earning
            </Link>
          </div>
        </div>
      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
