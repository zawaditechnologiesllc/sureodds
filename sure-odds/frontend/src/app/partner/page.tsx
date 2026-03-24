"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import {
  Copy,
  CheckCircle,
  DollarSign,
  Users,
  MousePointer,
  TrendingUp,
  Instagram,
  Twitter,
  Youtube,
  Send,
  Clock,
  ArrowRight,
  Star,
  Shield,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

type Tab = "overview" | "apply";

const HOW_IT_WORKS = [
  {
    num: "1",
    icon: Star,
    title: "Apply",
    desc: "Submit your application with your social media profiles and follower counts. It takes less than 2 minutes.",
  },
  {
    num: "2",
    icon: Shield,
    title: "Get Reviewed",
    desc: "Our team reviews every application within 48 hours. We look at follower count, engagement rate, and content quality.",
  },
  {
    num: "3",
    icon: Zap,
    title: "Go Live",
    desc: "Approved partners receive a unique referral link and access to their dashboard immediately.",
  },
  {
    num: "4",
    icon: DollarSign,
    title: "Earn 30%",
    desc: "Earn 30% of every subscription your referrals pay — for as long as they stay subscribed. No cap, no expiry.",
  },
];

const REQUIREMENTS = [
  "At least 2,000 followers on any major platform",
  "Sports, betting, or finance-related content",
  "Active account (posted in the last 30 days)",
  "Engaged audience (not bought followers)",
];

const EARNINGS_ESTIMATE = [
  { followers: "2K–5K", referred: "10–30", monthly: "$30–$90" },
  { followers: "5K–20K", referred: "30–100", monthly: "$90–$300" },
  { followers: "20K–100K", referred: "100–500", monthly: "$300–$1,500" },
  { followers: "100K+", referred: "500+", monthly: "$1,500+" },
];

const MOCK_STATS = [
  { label: "Link Clicks", value: "142", icon: MousePointer, color: "text-white" },
  { label: "Sign Ups", value: "23", icon: Users, color: "text-brand-green" },
  { label: "Earnings (This Month)", value: "$69.00", icon: DollarSign, color: "text-brand-yellow" },
  { label: "Conversion Rate", value: "16.2%", icon: TrendingUp, color: "text-brand-green" },
];

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "twitter", label: "X / Twitter", icon: Twitter },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "telegram", label: "Telegram", icon: Send },
  { value: "tiktok", label: "TikTok", icon: Zap },
  { value: "other", label: "Other", icon: Users },
];

const FOLLOWER_RANGES = [
  "2,000 – 5,000",
  "5,000 – 20,000",
  "20,000 – 100,000",
  "100,000 – 500,000",
  "500,000+",
];

export default function PartnerPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);

  // Application form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    platform: "",
    handle: "",
    followers: "",
    website: "",
    why: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const MOCK_REF_CODE = "SURE-DEMO123";
  const refLink = `https://sureodds.app?ref=${MOCK_REF_CODE}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    toast.success("Application submitted! We'll review it within 48 hours.");
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-950 border border-yellow-900 text-brand-yellow text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <DollarSign className="w-3.5 h-3.5" />
            Affiliate Program
          </div>
          <h1 className="text-white font-black text-4xl mb-3">
            Earn <span className="text-brand-yellow">30% Commission</span>
            <br />
            On Every Referral
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Turn your sports audience into monthly recurring income. Apply to partner with Sure Odds
            and earn 30% of every subscription — forever.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-brand-card border border-brand-border rounded-lg p-1 mb-8">
          {(["overview", "apply"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded text-sm font-bold transition-colors capitalize ${
                tab === t ? "bg-brand-red text-white" : "text-brand-muted hover:text-white"
              }`}
            >
              {t === "overview" ? "How It Works" : "Apply Now"}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div>
            {/* Steps */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {HOW_IT_WORKS.map(({ num, icon: Icon, title, desc }) => (
                <div key={num} className="bg-brand-card border border-brand-border rounded-xl p-5 flex gap-4">
                  <div className="w-10 h-10 bg-red-950 border border-red-900 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand-red" />
                  </div>
                  <div>
                    <p className="text-brand-muted text-[10px] font-black uppercase tracking-widest mb-0.5">Step {num}</p>
                    <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
                    <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Approval Criteria */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-6 mb-6">
              <h2 className="text-white font-bold text-lg mb-1">Approval Criteria</h2>
              <p className="text-brand-muted text-sm mb-4">
                We review every application manually. Our goal is quality over quantity — we want partners
                with real, engaged audiences who are genuinely interested in sports and predictions.
              </p>
              <ul className="space-y-2">
                {REQUIREMENTS.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-brand-dark border border-brand-border rounded-lg text-xs text-brand-muted">
                <strong className="text-white">Note:</strong> Higher follower counts with strong engagement are approved faster.
                Pro subscribers get priority review. Applications are reviewed within 48 hours.
              </div>
            </div>

            {/* Earnings Estimator */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-6 mb-6">
              <h2 className="text-white font-bold text-lg mb-1">Earnings Estimator</h2>
              <p className="text-brand-muted text-sm mb-4">
                Based on typical conversion rates at each follower level.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th className="text-left text-xs text-brand-muted font-medium py-2 pr-4">Your Followers</th>
                      <th className="text-left text-xs text-brand-muted font-medium py-2 pr-4">Est. Referrals/mo</th>
                      <th className="text-left text-xs text-brand-muted font-medium py-2">Est. Earnings/mo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {EARNINGS_ESTIMATE.map((row) => (
                      <tr key={row.followers}>
                        <td className="py-2.5 pr-4 text-white font-medium text-xs">{row.followers}</td>
                        <td className="py-2.5 pr-4 text-brand-muted text-xs">{row.referred}</td>
                        <td className="py-2.5 text-brand-yellow font-bold text-xs">{row.monthly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-brand-muted text-[11px] mt-3">
                * Estimates based on a $9.99/month Premium plan at 30% commission.
              </p>
            </div>

            {/* Payout info */}
            <div className="bg-gradient-to-r from-yellow-950 to-brand-card border border-yellow-900 rounded-xl p-6 mb-8">
              <h3 className="text-white font-bold text-lg mb-3">Payout Details</h3>
              <ul className="space-y-2 text-sm">
                {[
                  "Earn 30% of every subscription your referrals pay — recurring, for life",
                  "Payouts sent monthly via M-Pesa or bank transfer",
                  "Minimum payout: $10",
                  "Track all earnings in real-time on your partner dashboard",
                  "No limit on how many people you can refer",
                  "Pro subscribers get priority access and a dedicated partner manager",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-gray-300">
                    <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center">
              <button
                onClick={() => setTab("apply")}
                className="inline-flex items-center gap-2 bg-brand-yellow hover:bg-yellow-400 text-black font-black px-10 py-4 rounded-lg text-lg transition-colors"
              >
                Apply to Partner <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* APPLY TAB */}
        {tab === "apply" && (
          <div>
            {submitted ? (
              <div className="bg-brand-card border border-green-900 rounded-xl p-10 text-center">
                <div className="w-16 h-16 bg-green-950 border border-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-brand-green" />
                </div>
                <h2 className="text-white font-black text-2xl mb-2">Application Submitted!</h2>
                <p className="text-brand-muted text-sm max-w-sm mx-auto mb-6">
                  Thank you for applying. Our team will review your application within 48 hours and contact
                  you at the email you provided.
                </p>
                <div className="flex items-center justify-center gap-2 text-brand-muted text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  Review time: up to 48 hours
                </div>
              </div>
            ) : (
              <div className="bg-brand-card border border-brand-border rounded-xl p-6">
                <h2 className="text-white font-black text-xl mb-1">Partner Application</h2>
                <p className="text-brand-muted text-sm mb-6">
                  Fill in your details below. We&apos;ll review your application and respond within 48 hours.
                </p>

                <form onSubmit={handleApply} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Primary Platform *</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PLATFORMS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm({ ...form, platform: value })}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-bold transition-colors ${
                            form.platform === value
                              ? "bg-red-950 border-brand-red text-white"
                              : "bg-brand-dark border-brand-border text-brand-muted hover:text-white hover:border-gray-500"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Profile Handle / Username *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">@</span>
                        <input
                          type="text"
                          required
                          value={form.handle}
                          onChange={(e) => setForm({ ...form, handle: e.target.value })}
                          placeholder="yourhandle"
                          className="w-full bg-brand-dark border border-brand-border rounded-lg pl-8 pr-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Follower Count *</label>
                      <select
                        required
                        value={form.followers}
                        onChange={(e) => setForm({ ...form, followers: e.target.value })}
                        className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red transition-colors"
                      >
                        <option value="" className="text-brand-muted">Select range...</option>
                        {FOLLOWER_RANGES.map((r) => (
                          <option key={r} value={r}>{r} followers</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Website or Channel Link <span className="text-brand-muted text-xs">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Why do you want to partner with Sure Odds? *
                    </label>
                    <textarea
                      required
                      value={form.why}
                      onChange={(e) => setForm({ ...form, why: e.target.value })}
                      placeholder="Tell us about your audience and why you'd be a great partner..."
                      rows={4}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder:text-brand-muted text-sm focus:outline-none focus:border-brand-red transition-colors resize-none"
                    />
                  </div>

                  <div className="bg-brand-dark border border-brand-border rounded-lg p-4 text-xs text-brand-muted">
                    <strong className="text-white">What happens next:</strong> Our team will review your application
                    within 48 hours. Higher-follower accounts with engaged, sports-focused audiences are prioritised.
                    If approved, you&apos;ll get an email with your referral link and dashboard access.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !form.platform}
                    className="w-full bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-black py-3.5 rounded-lg transition-colors text-base"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
