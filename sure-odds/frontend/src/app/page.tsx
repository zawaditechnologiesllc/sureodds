import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  Lock,
  TrendingUp,
  Users,
  Zap,
  Shield,
  Star,
  CheckCircle,
  XCircle,
  ChevronDown,
  Brain,
  Database,
  Clock,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Our FastAPI prediction engine analyzes thousands of data points — form, injuries, head-to-head, home/away records — to generate probability estimates.",
  },
  {
    icon: Shield,
    title: "Verified Track Record",
    desc: "Every prediction is logged before kick-off and verified after. Our results page shows the full history — wins, losses, nothing hidden.",
  },
  {
    icon: Database,
    title: "Multiple Markets",
    desc: "Get predictions for 1X2, Over/Under 2.5, and Both Teams To Score — each with percentage probabilities and a best-pick recommendation.",
  },
  {
    icon: Clock,
    title: "Daily Updates",
    desc: "Predictions are updated 24 hours before kick-off and refreshed when team news breaks. You always get the freshest data.",
  },
];

const STATS = [
  { label: "Accuracy This Month", value: "73%", color: "text-brand-green" },
  { label: "Predictions Made", value: "1,240+", color: "text-white" },
  { label: "Active Members", value: "4,800+", color: "text-white" },
  { label: "Commission Paid Out", value: "$12,400", color: "text-brand-yellow" },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Sign Up for Free",
    desc: "Create an account in 30 seconds. No credit card needed to get started.",
  },
  {
    num: "02",
    title: "Browse Predictions",
    desc: "See today's upcoming matches across the Premier League, La Liga, Serie A, Bundesliga, and Kenyan Premier League.",
  },
  {
    num: "03",
    title: "Upgrade for Full Access",
    desc: "Free accounts see 2 picks per day. Premium members unlock every match with full probability breakdowns.",
  },
  {
    num: "04",
    title: "Track Our Record",
    desc: "Check the Results page every day. We log predictions before kick-off and update results after the final whistle.",
  },
];

const PRICING_PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Get a taste of data-driven predictions.",
    features: [
      "2 predictions per day",
      "Basic match info",
      "Results page access",
      "Community Telegram access",
    ],
    locked: ["Full probability breakdown", "High-confidence picks", "Multi-market predictions", "Email alerts"],
    cta: "Get Started",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "per month",
    desc: "Everything you need to bet smarter every day.",
    features: [
      "Unlimited daily predictions",
      "Full probability breakdown",
      "High / Medium / Low confidence badges",
      "1X2, Over 2.5 & BTTS markets",
      "Email alerts for top picks",
      "Priority support",
    ],
    locked: [],
    cta: "Start Premium",
    href: "/auth/signup",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    price: "$19.99",
    period: "per month",
    desc: "For serious bettors who want the edge.",
    features: [
      "Everything in Premium",
      "Early access — predictions 48h ahead",
      "Telegram VIP group",
      "Weekly prediction performance report",
      "Access to partner affiliate program",
      "Dedicated account manager",
    ],
    locked: [],
    cta: "Go Pro",
    href: "/auth/signup",
    highlight: false,
    badge: "Best Value",
  },
];

const RECENT_RESULTS = [
  { home: "Man City", away: "Wolves", score: "3–1", prediction: "Home Win", won: true, league: "Premier League" },
  { home: "Liverpool", away: "Brentford", score: "1–1", prediction: "Home Win", won: false, league: "Premier League" },
  { home: "Real Madrid", away: "Sevilla", score: "2–1", prediction: "Over 2.5", won: true, league: "La Liga" },
  { home: "Gor Mahia", away: "Sofapaka", score: "2–0", prediction: "Home Win", won: true, league: "Kenyan Premier League" },
  { home: "Inter Milan", away: "Napoli", score: "1–0", prediction: "Under 2.5", won: true, league: "Serie A" },
];

const FAQS = [
  {
    q: "Are these predictions guaranteed?",
    a: "No prediction in sports is ever guaranteed. Sure Odds uses AI and historical data to calculate probabilities — we give you better-informed picks, not certainties. Always bet responsibly.",
  },
  {
    q: "How are predictions generated?",
    a: "Our Python + FastAPI backend fetches live fixture data, then runs a machine-learning model trained on thousands of historical matches. It considers form, head-to-head records, home/away performance, and more.",
  },
  {
    q: "What leagues do you cover?",
    a: "We cover the Premier League, La Liga, Serie A, Bundesliga, and the Kenyan Premier League. More leagues are coming soon.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, you can cancel any time from your account settings. You keep access until the end of your billing period. No questions asked.",
  },
  {
    q: "How do I join the affiliate program?",
    a: "Visit the Partner page and submit an application. Management reviews applications based on your social media following and engagement. Pro subscribers get priority access.",
  },
  {
    q: "How are payouts processed?",
    a: "Affiliate commissions are paid monthly via M-Pesa or bank transfer. The minimum payout threshold is $10.",
  },
];

export default function HomePage() {
  const wonCount = RECENT_RESULTS.filter((r) => r.won).length;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-28 relative">
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
              Professional-grade football predictions with confidence ratings and full probability
              breakdowns — backed by a machine-learning engine, verified by real results.
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
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-brand-muted text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Today's Featured Picks */}
      <section className="max-w-5xl mx-auto px-4 py-14">
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
          {[
            { league: "Premier League", time: "20:00", home: "Man City", away: "Arsenal", confidence: "HIGH 78%", badgeClass: "bg-green-950 text-brand-green border-green-900", locked: false },
            { league: "La Liga", time: "21:00", home: "Real Madrid", away: "Barcelona", confidence: "MED 62%", badgeClass: "bg-yellow-950 text-brand-yellow border-yellow-900", locked: false },
            { league: "Serie A", time: "19:45", home: "Inter Milan", away: "Juventus", confidence: "HIGH 71%", badgeClass: "bg-green-950 text-brand-green border-green-900", locked: true },
            { league: "Bundesliga", time: "18:30", home: "Bayern Munich", away: "Dortmund", confidence: "MED 58%", badgeClass: "bg-yellow-950 text-brand-yellow border-yellow-900", locked: true },
          ].map((match, i) => (
            <div key={i} className="bg-brand-card border border-brand-border rounded-lg p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-brand-muted text-xs mb-1">{match.league} · {match.time}</p>
                  <p className="text-white font-bold">{match.home} vs {match.away}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded border ${match.badgeClass}`}>
                  {match.confidence}
                </span>
              </div>
              {!match.locked ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {[`Home`, `Draw`, `Away`].map((label, j) => (
                    <div key={label} className={`odds-btn ${j === 0 ? "selected" : ""}`}>
                      <span className="label">{label}</span>
                      <span className="value">{["1.92", "3.40", "4.20"][j]}</span>
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Last 5 Games Results */}
      <section className="max-w-5xl mx-auto px-4 py-10 border-t border-brand-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-black text-xl mb-1">Our Last 5 Results</h2>
            <p className="text-brand-muted text-xs">
              {wonCount}/5 correct &nbsp;·&nbsp;
              <span className="text-brand-green font-bold">{Math.round((wonCount / 5) * 100)}% accuracy</span>
            </p>
          </div>
          <Link href="/results" className="text-brand-red text-sm font-bold hover:text-red-400 flex items-center gap-1">
            Full History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {RECENT_RESULTS.map((r, i) => (
            <div key={i} className="bg-brand-card border border-brand-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-brand-muted text-[11px] shrink-0 hidden sm:block">{r.league}</span>
                <span className="text-white text-sm font-bold truncate">
                  {r.home} <span className="text-brand-muted font-normal">vs</span> {r.away}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-brand-muted text-xs font-mono">{r.score}</span>
                <span className="text-white text-xs">→ <span className="text-brand-muted">{r.prediction}</span></span>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${r.won ? "bg-green-950 text-brand-green border-green-900" : "bg-red-950 text-brand-red border-red-900"}`}>
                  {r.won ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {r.won ? "WON" : "LOST"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">How Sure Odds Works</h2>
        <p className="text-brand-muted text-center text-sm mb-10">From data to decision in seconds</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map(({ num, title, desc }) => (
            <div key={num} className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="text-brand-red font-black text-3xl mb-3 font-mono">{num}</div>
              <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">Why Choose Sure Odds?</h2>
        <p className="text-brand-muted text-center text-sm mb-10">Built differently from every tipster site you&apos;ve tried</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-brand-card border border-brand-border rounded-xl p-5 flex gap-4">
              <div className="w-10 h-10 bg-red-950 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1.5">{title}</h3>
                <p className="text-brand-muted text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">Simple Pricing</h2>
        <p className="text-brand-muted text-center text-sm mb-10">Start free. Upgrade when you&apos;re ready.</p>

        <div className="grid md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? "bg-gradient-to-b from-red-950/40 to-brand-card border-brand-red"
                  : "bg-brand-card border-brand-border"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full border ${plan.highlight ? "bg-brand-red border-brand-red text-white" : "bg-yellow-950 border-yellow-900 text-brand-yellow"}`}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <p className="text-brand-muted text-xs font-bold uppercase tracking-widest mb-1">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-white font-black text-4xl">{plan.price}</span>
                  <span className="text-brand-muted text-sm mb-1">/{plan.period}</span>
                </div>
                <p className="text-brand-muted text-xs">{plan.desc}</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.locked.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-brand-muted line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full text-center font-bold py-3 rounded-lg text-sm transition-colors ${
                  plan.highlight
                    ? "bg-brand-red hover:bg-red-700 text-white"
                    : "bg-brand-dark border border-brand-border hover:border-gray-500 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-brand-muted text-xs mt-6">
          All plans include a 7-day money-back guarantee. No contracts — cancel any time.
        </p>
      </section>

      {/* Partner Teaser */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-yellow-950/60 to-brand-card border border-yellow-900/50 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-950 border border-yellow-900 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-brand-yellow" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg mb-1">
                Got an audience? Earn <span className="text-brand-yellow">30% commission</span>.
              </h3>
              <p className="text-brand-muted text-sm">
                Apply to our affiliate program. Approved partners get a unique referral link and earn monthly from every subscriber they bring in.
              </p>
            </div>
          </div>
          <Link
            href="/partner"
            className="shrink-0 inline-flex items-center gap-2 bg-brand-yellow hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Apply to Partner <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-14 border-t border-brand-border">
        <h2 className="text-white font-black text-2xl text-center mb-2">Frequently Asked Questions</h2>
        <p className="text-brand-muted text-center text-sm mb-10">Everything you need to know</p>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-brand-card border border-brand-border rounded-xl">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                <span className="text-white font-bold text-sm">{q}</span>
                <ChevronDown className="w-4 h-4 text-brand-muted group-open:rotate-180 transition-transform shrink-0 ml-3" />
              </summary>
              <div className="px-5 pb-4 text-brand-muted text-xs leading-relaxed border-t border-brand-border pt-3">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-red-950 to-brand-card border border-red-900 rounded-xl p-10 text-center">
          <h2 className="text-white font-black text-3xl mb-3">Ready to Bet Smarter?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join 4,800+ members who get daily predictions from a system that shows its work.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-black px-10 py-4 rounded-lg text-lg transition-colors"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center gap-2 bg-brand-card border border-brand-border hover:border-gray-500 text-white font-bold px-8 py-4 rounded-lg transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <MobileNav />
      <div className="h-16 md:h-0" />
    </div>
  );
}
