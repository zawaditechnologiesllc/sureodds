"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { Zap, Target, TrendingUp, MapPin, Users, Trophy, BarChart2, ShieldCheck, Star, ChevronRight, Crown, Flame } from "lucide-react";
import Link from "next/link";

const STATS = [
  { label: "Registered Members", value: "12,000+", icon: Users },
  { label: "Predictions Made", value: "50,000+", icon: BarChart2 },
  { label: "Average Accuracy", value: "74%", icon: Target },
  { label: "Winning Streaks Delivered", value: "300+", icon: Trophy },
];

const WINS = [
  {
    date: "Feb 2025",
    title: "18/20 Correct Predictions — Premier League Matchday",
    desc: "A standout week where our AI engine called 18 out of 20 Premier League fixtures correctly, delivering a combined odds slip of over 400x for bundle holders.",
    badge: "Premier League",
    badgeColor: "bg-purple-950/40 text-purple-300 border-purple-800/40",
  },
  {
    date: "Jan 2025",
    title: "5-Game La Liga Winning Streak",
    desc: "Five consecutive correct 1X2 calls across La Liga matchdays, including a correct draw prediction for Atletico Madrid vs Barcelona at 3.60 odds.",
    badge: "La Liga",
    badgeColor: "bg-orange-950/40 text-orange-300 border-orange-800/40",
  },
  {
    date: "Dec 2024",
    title: "Mega Slip — 680x Total Odds Delivered",
    desc: "Our highest-rated Mega Slip bundle of the year returned an 11-pick combination at 680x combined odds, fully confirmed. All 11 picks landed.",
    badge: "Mega Slip",
    badgeColor: "bg-red-950/40 text-red-300 border-red-800/40",
  },
  {
    date: "Oct 2024",
    title: "Serie A Over 2.5 Accuracy: 82% for the Month",
    desc: "Throughout October 2024, our goal-line predictions for Serie A fixtures hit at an 82% rate — the single best monthly stat in our history.",
    badge: "Serie A",
    badgeColor: "bg-blue-950/40 text-blue-300 border-blue-800/40",
  },
  {
    date: "Sep 2024",
    title: "BTTS Streak — 9 of 10 Bundesliga Matches Correct",
    desc: "Nine out of ten Both Teams to Score predictions landed correctly across Bundesliga fixtures in a single match week, a platform record.",
    badge: "Bundesliga",
    badgeColor: "bg-yellow-950/40 text-yellow-300 border-yellow-900/40",
  },
];

const HOW_WE_WORK = [
  {
    step: "1",
    title: "Data Collection",
    body: "We ingest live fixtures, historical results, and team form data from Football-Data.org — one of Europe's leading football statistics providers. Our pipeline runs twice daily.",
  },
  {
    step: "2",
    title: "AI Prediction Engine",
    body: "Each fixture is run through our proprietary model: 5-match rolling form, head-to-head records, goal averages scored and conceded, and home/away advantage all feed into the probability engine.",
  },
  {
    step: "3",
    title: "Confidence Scoring",
    body: "Every prediction is tagged with a confidence tier — Standard, High Confidence, or Lock. Only predictions exceeding our internal threshold appear as premium picks.",
  },
  {
    step: "4",
    title: "Human Review",
    body: "Our analyst team reviews the top confidence picks before publishing. Outliers, injury news, or unusual line movements are factored in manually before bundles go live.",
  },
  {
    step: "5",
    title: "Transparent Results",
    body: "Every prediction we publish is tracked. The Results page shows our full record — wins, draws, losses, and accuracy percentage — updated automatically after each match.",
  },
];

const LEAGUES = [
  { name: "Premier League", country: "England", color: "text-purple-400" },
  { name: "La Liga", country: "Spain", color: "text-orange-400" },
  { name: "Serie A", country: "Italy", color: "text-blue-400" },
  { name: "Bundesliga", country: "Germany", color: "text-yellow-400" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-brand-darker to-brand-dark border-b border-brand-border">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
          <div className="absolute top-8 left-12 text-[120px] font-black text-brand-red leading-none">S</div>
          <div className="absolute bottom-4 right-16 text-[80px] font-black text-brand-green leading-none">%</div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-20 relative">
          <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 rounded-full px-4 py-1.5 mb-6">
            <Zap className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-brand-red text-xs font-bold uppercase tracking-widest">About Sure Odds</span>
          </div>
          <h1 className="text-white font-black text-4xl md:text-6xl mb-5 leading-tight max-w-3xl">
            The Smartest Way to Follow Football Predictions
          </h1>
          <p className="text-brand-muted text-lg max-w-2xl leading-relaxed mb-8">
            Sure Odds is Africa&apos;s leading AI-powered football prediction platform. We combine deep statistical
            analysis with machine learning to deliver high-confidence match predictions across Europe&apos;s top leagues.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              <Zap className="w-4 h-4" /> See Today&apos;s Predictions
            </Link>
            <Link
              href="/results"
              className="inline-flex items-center gap-2 border border-brand-border hover:border-gray-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              <TrendingUp className="w-4 h-4" /> View Our Track Record
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-brand-card border border-brand-border rounded-2xl p-5 text-center">
              <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-brand-red" />
              </div>
              <p className="text-white font-black text-2xl leading-none mb-1">{value}</p>
              <p className="text-brand-muted text-xs leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Our Story ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-full px-3 py-1 mb-4">
              <Star className="w-3 h-3 text-brand-green" />
              <span className="text-brand-green text-xs font-bold uppercase tracking-widest">Our Story</span>
            </div>
            <h2 className="text-white font-black text-3xl mb-5 leading-tight">
              Built by Analysts. Powered by Data.
            </h2>
            <p className="text-brand-muted text-sm leading-relaxed mb-4">
              Sure Odds was founded in Nairobi, Kenya in 2023 by a team of football enthusiasts and data scientists
              who were frustrated by prediction services that relied on gut feeling and hype rather than mathematics.
            </p>
            <p className="text-brand-muted text-sm leading-relaxed mb-4">
              We spent six months building our prediction engine before going live — backtesting thousands of
              historical fixtures to validate our model before a single prediction went public.
            </p>
            <p className="text-brand-muted text-sm leading-relaxed">
              Today, Sure Odds serves football fans across East Africa and beyond, giving everyone access to the
              same quality of statistical analysis previously reserved for professional betting syndicates.
            </p>
          </div>
          <div className="space-y-4">
            {/* Location card */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">Based in Nairobi, Kenya</p>
                <p className="text-brand-muted text-xs leading-relaxed">
                  Operating from Nairobi with a remote team spanning Kenya, Uganda, and Tanzania. We understand
                  the East African football market — and we build for it.
                </p>
              </div>
            </div>
            {/* Covered leagues */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
              <p className="text-white font-bold text-sm mb-3">Leagues We Cover</p>
              <div className="space-y-2">
                {LEAGUES.map(({ name, country, color }) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${color}`}>{name}</span>
                    <span className="text-brand-muted text-xs">{country}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── How We Work ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-brand-card border border-brand-border rounded-full px-3 py-1 mb-4">
              <BarChart2 className="w-3 h-3 text-brand-muted" />
              <span className="text-brand-muted text-xs font-bold uppercase tracking-widest">How We Work</span>
            </div>
            <h2 className="text-white font-black text-3xl leading-tight">
              From Raw Data to Confident Predictions
            </h2>
          </div>
          <div className="space-y-4">
            {HOW_WE_WORK.map(({ step, title, body }) => (
              <div key={step} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-start gap-5">
                <span className="w-9 h-9 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red text-sm font-black shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-white font-bold text-base mb-1">{title}</p>
                  <p className="text-brand-muted text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Greatest Wins ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-yellow-950/40 border border-yellow-800/40 rounded-full px-3 py-1 mb-4">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Greatest Wins</span>
            </div>
            <h2 className="text-white font-black text-3xl leading-tight">
              Our Best Moments
            </h2>
            <p className="text-brand-muted text-sm mt-2 max-w-lg mx-auto">
              A selection of our most memorable prediction runs — tracked, verified, and on record.
            </p>
          </div>
          <div className="space-y-4">
            {WINS.map(({ date, title, desc, badge, badgeColor }) => (
              <div key={title} className="bg-brand-card border border-brand-border rounded-2xl p-6">
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badgeColor}`}>
                    {badge}
                  </span>
                  <span className="text-brand-muted text-xs font-medium">{date}</span>
                </div>
                <p className="text-white font-bold text-base mb-2">{title}</p>
                <p className="text-brand-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Our Values ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-white font-black text-3xl leading-tight">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: "Radical Transparency",
                body: "Every prediction we publish is tracked publicly on our Results page. We never hide losses or cherry-pick wins to inflate our record.",
                color: "text-brand-green",
                bg: "bg-brand-green/10 border-brand-green/20",
              },
              {
                icon: BarChart2,
                title: "Data Over Hype",
                body: "We don't predict because a team has famous players or a big stadium. We predict based on form, goals, and head-to-head statistics — nothing else.",
                color: "text-brand-red",
                bg: "bg-brand-red/10 border-brand-red/20",
              },
              {
                icon: Users,
                title: "Community First",
                body: "We built Sure Odds for everyday football fans — not syndicates. Our pricing reflects that, with free access for casual users and affordable packs for serious ones.",
                color: "text-yellow-400",
                bg: "bg-yellow-950/30 border-yellow-800/30",
              },
            ].map(({ icon: Icon, title, body, color, bg }) => (
              <div key={title} className="bg-brand-card border border-brand-border rounded-2xl p-6">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-white font-bold text-base mb-2">{title}</p>
                <p className="text-brand-muted text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Products Overview ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-white font-black text-3xl leading-tight">What We Offer</h2>
            <p className="text-brand-muted text-sm mt-2 max-w-lg mx-auto">
              Five distinct products — pick the access level that suits how you follow football.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: BarChart2,
                label: "Fixtures",
                href: "/predictions",
                color: "text-brand-red",
                bg: "bg-brand-red/10 border-brand-red/20",
                desc: "Daily AI predictions for all covered leagues with probability breakdowns.",
              },
              {
                icon: TrendingUp,
                label: "Results",
                href: "/results",
                color: "text-brand-green",
                bg: "bg-brand-green/10 border-brand-green/20",
                desc: "Our full historical prediction record — transparent win/loss tracking.",
              },
              {
                icon: Flame,
                label: "Bundles",
                href: "/bundles",
                color: "text-orange-400",
                bg: "bg-orange-950/30 border-orange-800/30",
                desc: "AI-assembled multi-match betting slips across four risk tiers.",
              },
              {
                icon: Crown,
                label: "VIP Access",
                href: "/vip",
                color: "text-yellow-400",
                bg: "bg-yellow-950/30 border-yellow-800/30",
                desc: "Full access to all premium predictions for a fixed daily, weekly, or monthly period.",
              },
              {
                icon: Zap,
                label: "Value Packs",
                href: "/pricing",
                color: "text-brand-green",
                bg: "bg-brand-green/10 border-brand-green/20",
                desc: "Credit packs to unlock individual predictions. Credits never expire.",
              },
            ].map(({ icon: Icon, label, href, color, bg, desc }) => (
              <Link
                key={label}
                href={href}
                className="group bg-brand-card border border-brand-border hover:border-gray-500 rounded-2xl p-5 flex items-start gap-4 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-bold text-sm">{label}</p>
                    <ChevronRight className="w-4 h-4 text-brand-muted group-hover:text-white transition-colors shrink-0" />
                  </div>
                  <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-brand-red/10 to-transparent border border-brand-red/20 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-brand-red" />
          </div>
          <h3 className="text-white font-black text-2xl mb-3">Ready to Back Your Knowledge?</h3>
          <p className="text-brand-muted text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Join over 12,000 members already using Sure Odds to sharpen their football predictions.
            Two free picks every day — no card required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              <Zap className="w-4 h-4" /> Get Started Free
            </Link>
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 border border-brand-border hover:border-gray-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Browse Today&apos;s Picks
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
