import Link from "next/link";
import { ArrowRight, BarChart2, Lock, TrendingUp, Users, Zap, Shield, Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";

const MOCK_FEATURES = [
  {
    icon: BarChart2,
    title: "Data-Driven Predictions",
    desc: "AI-powered predictions with confidence ratings based on historical data, form, and head-to-head stats.",
  },
  {
    icon: Shield,
    title: "Verified Accuracy",
    desc: "Every prediction is tracked and verified. Our results page shows win/loss history — no hidden stats.",
  },
  {
    icon: TrendingUp,
    title: "Multiple Markets",
    desc: "1X2, Over/Under 2.5, and Both Teams To Score predictions with probability breakdowns.",
  },
  {
    icon: Users,
    title: "Earn 30% Commission",
    desc: "Refer friends and earn 30% of their subscription fees. Cash out monthly.",
  },
];

const MOCK_STATS = [
  { label: "Accuracy This Month", value: "73%", color: "text-brand-green" },
  { label: "Predictions Made", value: "1,240", color: "text-white" },
  { label: "Active Members", value: "4,800+", color: "text-white" },
  { label: "Commission Paid", value: "$12,400", color: "text-brand-yellow" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-red-950 border border-red-900 text-brand-red text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Powered by AI & Historical Data
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              Sports Predictions
              <br />
              <span className="text-brand-red">You Can Trust</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Get professional-grade football predictions with confidence ratings. See probabilities
              like odds — but backed by real data.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/predictions"
                className="inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-lg text-base transition-colors"
              >
                Unlock Today&apos;s Picks
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/results"
                className="inline-flex items-center justify-center gap-2 bg-brand-card border border-brand-border hover:border-gray-500 text-white font-bold px-8 py-3.5 rounded-lg text-base transition-colors"
              >
                View Track Record
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-brand-border bg-brand-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {MOCK_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-brand-muted text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Matches Preview */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-black text-xl">
            <Star className="w-5 h-5 text-brand-red inline mr-2" />
            Today&apos;s Featured Picks
          </h2>
          <Link
            href="/predictions"
            className="text-brand-red text-sm font-bold hover:text-red-400 transition-colors flex items-center gap-1"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-brand-card border border-brand-border rounded-lg p-4 relative overflow-hidden"
            >
              {i <= 2 ? (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-brand-muted text-xs mb-1">Premier League · 20:00</p>
                      <p className="text-white font-bold">Man City vs Arsenal</p>
                    </div>
                    <span className="bg-green-950 text-brand-green text-[10px] font-black px-2 py-1 rounded border border-green-900">
                      HIGH 78%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Home 1.92", "Draw 3.40", "Away 4.20"].map((btn, j) => (
                      <div
                        key={btn}
                        className={`odds-btn ${j === 0 ? "selected" : ""}`}
                      >
                        <span className="label">{btn.split(" ")[0]}</span>
                        <span className="value">{btn.split(" ")[1]}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-brand-muted text-xs mb-1">La Liga · 21:00</p>
                      <p className="text-white font-bold">Real Madrid vs Barcelona</p>
                    </div>
                    <span className="bg-yellow-950 text-brand-yellow text-[10px] font-black px-2 py-1 rounded border border-yellow-900">
                      MED 62%
                    </span>
                  </div>
                  <div className="relative">
                    <div className="grid grid-cols-3 gap-1.5 blur-sm opacity-60 select-none pointer-events-none">
                      {["Home ?", "Draw ?", "Away ?"].map((btn) => (
                        <div key={btn} className="odds-btn">
                          <span className="label">{btn.split(" ")[0]}</span>
                          <span className="value">{btn.split(" ")[1]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Link
                        href="/auth/signup"
                        className="flex items-center gap-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded transition-colors"
                      >
                        <Lock className="w-3 h-3" />
                        Unlock Predictions
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12 border-t border-brand-border">
        <h2 className="text-white font-black text-xl text-center mb-8">
          Why Choose Sure Odds?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-brand-card border border-brand-border rounded-lg p-4"
            >
              <div className="w-9 h-9 bg-red-950 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-brand-red" />
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-red-950 to-brand-card border border-red-900 rounded-xl p-8 text-center">
          <h2 className="text-white font-black text-2xl mb-2">Ready to Win Smarter?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join thousands of bettors who trust Sure Odds for daily predictions with proven accuracy.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-black px-10 py-4 rounded-lg text-lg transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
