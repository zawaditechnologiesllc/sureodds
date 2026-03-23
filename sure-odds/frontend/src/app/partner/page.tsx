"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import { Copy, CheckCircle, DollarSign, Users, MousePointer, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

const MOCK_REF_CODE = "SURE-DEMO123";

const STATS = [
  { label: "Link Clicks", value: "142", icon: MousePointer, color: "text-white" },
  { label: "Sign Ups", value: "23", icon: Users, color: "text-brand-green" },
  { label: "Earnings", value: "$69.00", icon: DollarSign, color: "text-brand-yellow" },
  { label: "Conversion Rate", value: "16.2%", icon: TrendingUp, color: "text-brand-green" },
];

const STEPS = [
  { num: "1", title: "Get Your Link", desc: "Sign up and get a unique referral link instantly." },
  { num: "2", title: "Share It", desc: "Share on social media, WhatsApp, Telegram, blogs — anywhere." },
  { num: "3", title: "Earn 30%", desc: "Earn 30% of every subscription from your referrals. Forever." },
];

export default function PartnerPage() {
  const [copied, setCopied] = useState(false);
  const refLink = `https://sureodds.app?ref=${MOCK_REF_CODE}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
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
            Refer friends to Sure Odds and earn 30% of their subscription — for as long as they
            stay subscribed. No cap, no expiry.
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-brand-card border border-brand-border rounded-xl p-5 text-center"
            >
              <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center text-white font-black text-lg mx-auto mb-3">
                {step.num}
              </div>
              <h3 className="text-white font-bold mb-2">{step.title}</h3>
              <p className="text-brand-muted text-sm">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Referral Link Generator */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6 mb-8">
          <h2 className="text-white font-black text-lg mb-4">Your Referral Link</h2>
          <div className="flex gap-2">
            <div className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-brand-muted text-sm font-mono overflow-hidden text-ellipsis whitespace-nowrap">
              {refLink}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold px-5 py-3 rounded-lg transition-colors shrink-0"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-brand-muted text-xs mt-2">
            Sign up to generate your personal referral link
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-8">
          <h2 className="text-white font-black text-lg mb-4">Your Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="bg-brand-card border border-brand-border rounded-xl p-4"
              >
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <div className={`text-2xl font-black ${color} mb-1`}>{value}</div>
                <div className="text-brand-muted text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payout info */}
        <div className="bg-gradient-to-r from-yellow-950 to-brand-card border border-yellow-900 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-2">Payout Details</h3>
          <ul className="space-y-2 text-sm">
            {[
              "Earn 30% of every subscription your referrals pay",
              "Payouts sent monthly via M-Pesa or bank transfer",
              "Minimum payout: $10",
              "Track all earnings in real-time on your dashboard",
              "No limit on how many people you can refer",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
