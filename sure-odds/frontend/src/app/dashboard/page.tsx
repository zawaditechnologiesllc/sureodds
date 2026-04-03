"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Zap, CreditCard, TrendingUp, CheckCircle, Lock, BarChart2,
  Star, Loader2, ArrowRight, Gift, Users, PlusCircle, RefreshCw, Crown, Clock,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { fetchPaymentStatus } from "@/lib/api";

interface PaymentStatus {
  is_paid: boolean;
  subscription_status: string;
  picks_remaining: number;
  can_access_premium: boolean;
  vip_active?: boolean;
  vip_expires_at?: string | null;
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
      const status = await fetchPaymentStatus();
      setPaymentStatus(status);
      setCredits(status.picks_remaining ?? 0);
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
        <Link
          href="/auth/login?redirect=/dashboard"
          className="bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  const isPaid = paymentStatus?.is_paid ?? false;
  const isVip = paymentStatus?.vip_active ?? false;
  const vipExpiresAt = paymentStatus?.vip_expires_at ?? null;
  const username = user?.email?.split("@")[0] ?? "User";

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-brand-muted text-sm mb-1">Welcome back,</p>
            <h1 className="text-white font-black text-3xl">{username}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {isVip ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-yellow-950/30 text-yellow-400 border-yellow-600/40">
                  <Crown className="w-3 h-3" />
                  VIP Active
                </span>
              ) : isPaid ? (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30">
                  Premium Plan
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-brand-card text-brand-muted border-brand-border">
                  Free Plan
                </span>
              )}
              {isVip && vipExpiresAt && (
                <span className="flex items-center gap-1 text-xs text-brand-muted">
                  <Clock className="w-3 h-3" />
                  expires {new Date(vipExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              <span className="text-brand-muted text-xs hidden sm:block">{user?.email}</span>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={dataLoading}
            className="p-2 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-gray-500 transition-colors disabled:opacity-40 mt-1"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Credits Hero Card */}
        <div className="bg-gradient-to-r from-green-950/30 via-brand-card to-brand-card border border-green-900/40 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-950/60 border border-green-900/60 rounded-2xl flex items-center justify-center shrink-0">
              <Zap className="w-7 h-7 text-brand-green" />
            </div>
            <div>
              <p className="text-brand-muted text-xs font-bold uppercase tracking-widest mb-0.5">
                Pick Credits
              </p>
              <p className="text-white font-black text-4xl leading-none">
                {dataLoading ? (
                  <span className="text-brand-muted text-2xl animate-pulse">—</span>
                ) : (
                  credits
                )}
              </p>
              <p className="text-brand-muted text-xs mt-1">
                {credits > 0
                  ? `${credits} credit${credits !== 1 ? "s" : ""} ready — go unlock your picks`
                  : "No credits — top up to unlock premium picks"}
              </p>
            </div>
          </div>
          <Link
            href="/packages"
            className="flex items-center gap-2 bg-brand-green hover:bg-green-600 text-black font-black px-6 py-3 rounded-xl transition-colors text-sm shrink-0 w-full sm:w-auto justify-center"
          >
            <PlusCircle className="w-4 h-4" />
            Add Balance
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Credits",
              value: dataLoading ? "—" : credits.toString(),
              icon: Zap,
              color: "text-brand-green",
              bg: "bg-green-950/20",
              border: "border-green-900/30",
            },
            {
              label: "Plan",
              value: dataLoading ? "—" : isVip ? "VIP" : isPaid ? "Premium" : "Free",
              icon: isVip ? Crown : Star,
              color: isVip ? "text-yellow-400" : "text-brand-yellow",
              bg: isVip ? "bg-yellow-950/30" : "bg-yellow-950/20",
              border: isVip ? "border-yellow-700/40" : "border-yellow-900/30",
            },
            {
              label: "Daily Picks",
              value: isPaid ? "Unlimited" : "2/day",
              icon: BarChart2,
              color: "text-brand-muted",
              bg: "bg-brand-dark",
              border: "border-brand-border",
            },
            {
              label: "Status",
              value: isVip ? "VIP Active" : isPaid ? "Active" : "Free",
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
              <h2 className="text-white font-black text-lg">Pick Credit Packs</h2>
            </div>
            <p className="text-brand-muted text-sm mb-5">
              No subscription. Buy credits, unlock individual high-confidence picks. Credits never expire.
            </p>

            <div className="space-y-2 mb-5">
              {[
                { label: "Starter", sub: "2 picks", price: "$2.99", tag: null },
                { label: "Value Pack", sub: "5 picks", price: "$4.99", tag: "Popular" },
                { label: "Pro Bundle", sub: "10 picks", price: "$8.99", tag: null },
              ].map(({ label, sub, price, tag }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-brand-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-brand-green" />
                    <div>
                      <span className="text-white text-sm font-medium">{label}</span>
                      <span className="text-brand-muted text-xs ml-1.5">{sub}</span>
                    </div>
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
              className="w-full py-3 rounded-xl bg-brand-red hover:bg-red-700 text-white font-black text-sm text-center transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Buy Credits Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Upgrade Card / Premium Active */}
          {!isPaid ? (
            <div className="bg-gradient-to-b from-yellow-950/30 to-brand-card border border-brand-yellow/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-brand-yellow fill-current" />
                <h2 className="text-white font-black text-lg">Upgrade to Premium</h2>
              </div>
              <p className="text-brand-muted text-sm mb-4">
                Unlimited daily predictions with full probability breakdowns, confidence badges, and multi-market analysis.
              </p>
              <div className="space-y-2 mb-5">
                {[
                  "Unlimited predictions every day",
                  "Full 1X2, Over 2.5 & BTTS markets",
                  "High / Medium / Low confidence badges",
                  "Email alerts for top picks",
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
            <div className="space-y-1">
              {[
                {
                  href: "/predictions",
                  label: "Today's Predictions",
                  sub: "View today's matches",
                  icon: BarChart2,
                  color: "text-brand-red",
                },
                {
                  href: "/results",
                  label: "Results & Track Record",
                  sub: "See our accuracy",
                  icon: TrendingUp,
                  color: "text-brand-green",
                },
                {
                  href: "/packages",
                  label: "Buy Pick Credits",
                  sub: "Top up your balance",
                  icon: CreditCard,
                  color: "text-brand-yellow",
                },
                {
                  href: "/partner",
                  label: "Earn 30% Commission",
                  sub: "Affiliate program",
                  icon: Gift,
                  color: "text-brand-muted",
                },
              ].map(({ href, label, sub, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-brand-dark group transition-colors"
                >
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium group-hover:text-white transition-colors">
                      {label}
                    </p>
                    <p className="text-brand-muted text-xs">{sub}</p>
                  </div>
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
              Share your referral link and earn 30% commission on every referred purchase — for life.
            </p>
            <div className="bg-brand-dark border border-brand-border rounded-lg px-4 py-3 mb-4">
              <p className="text-brand-muted text-xs mb-1">Your invite link</p>
              <p className="text-white text-xs font-mono truncate">
                https://sureodds.pro/invite?code=
                <span className="text-brand-green">{username.toUpperCase()}</span>
              </p>
            </div>
            <Link
              href="/partner"
              className="w-full py-3 rounded-xl border border-brand-border text-white font-bold text-sm text-center transition-colors hover:bg-brand-dark block"
            >
              View Partner Dashboard
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
