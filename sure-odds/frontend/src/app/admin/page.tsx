"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  RefreshCw,
  Users,
  BarChart2,
  Play,
  CheckCircle,
  AlertCircle,
  Instagram,
  Twitter,
  Youtube,
  Send,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Database,
  Zap,
  ShieldAlert,
  Flame,
  Shield,
  TrendingUp,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  triggerUpdateFixtures,
  triggerRunPredictions,
  triggerUpdateResults,
  fetchAdminStats,
  fetchAdminUsers,
  fetchApiStatus,
  generateBundle,
  fetchAdminBundles,
  activateBundle,
  deactivateBundle,
  adminLogin,
  clearAdminToken,
  getStoredAdminToken,
} from "@/lib/api";

type AdminTab = "overview" | "bundles" | "partners" | "users";
type ActionStatus = "idle" | "loading" | "success" | "error";
type PartnerStatus = "pending" | "approved" | "rejected";

interface AdminStats {
  total_users: number;
  paid_users: number;
  free_users: number;
  today_predictions: number;
  total_fixtures: number;
  today_fixtures: number;
  api_key_configured: boolean;
  environment: string;
}

interface AdminUser {
  id: string;
  email: string;
  isPaid: boolean;
  createdAt: string;
  referralCode: string;
}

interface PartnerApplication {
  id: string;
  name: string;
  email: string;
  platform: string;
  handle: string;
  followers: string;
  why: string;
  submittedAt: string;
  status: PartnerStatus;
}

const MOCK_APPLICATIONS: PartnerApplication[] = [
  { id: "p1", name: "James Odhiambo", email: "james@example.com", platform: "instagram", handle: "jamesbets_ke", followers: "20,000 – 100,000", why: "I have a sports tips page with high engagement. My audience trusts my analysis.", submittedAt: "2026-03-23", status: "pending" },
  { id: "p2", name: "Sarah Wanjiru", email: "sarah@example.com", platform: "twitter", handle: "sarahsports", followers: "5,000 – 20,000", why: "I tweet daily football analysis and have a loyal following that asks for tipster recommendations.", submittedAt: "2026-03-22", status: "pending" },
  { id: "p3", name: "Tony Mwangi", email: "tony@example.com", platform: "youtube", handle: "TonyFootball", followers: "100,000 – 500,000", why: "YouTube channel on football betting analysis.", submittedAt: "2026-03-21", status: "approved" },
  { id: "p4", name: "Linda Achieng", email: "linda@example.com", platform: "telegram", handle: "linda_tipster", followers: "2,000 – 5,000", why: "I run a Telegram channel for football predictions.", submittedAt: "2026-03-20", status: "rejected" },
];

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  telegram: Send,
  tiktok: BarChart2,
};

const StatusBadge = ({ status }: { status: PartnerStatus }) => {
  const map = {
    pending: "bg-yellow-950 text-brand-yellow border-yellow-900",
    approved: "bg-green-950 text-brand-green border-green-900",
    rejected: "bg-red-950 text-brand-red border-red-900",
  };
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${map[status]} uppercase`}>
      {status}
    </span>
  );
};

export default function AdminPage() {
  // ── Auth gate ───────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  // On mount — restore session if we already have a stored token that works
  useEffect(() => {
    const stored = getStoredAdminToken();
    if (!stored) { setChecking(false); return; }
    // Verify the stored token still grants admin access
    fetchAdminStats()
      .then(() => setAuthenticated(true))
      .catch(() => { clearAdminToken(); })
      .finally(() => setChecking(false));
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      await adminLogin(email, password);
      setAuthenticated(true);
    } catch (err: any) {
      clearAdminToken();
      const status = err?.response?.status;
      if (status === 401) {
        setLoginError("Incorrect email or password.");
      } else if (status === 403) {
        setLoginError("Access denied.");
      } else if (!status) {
        setLoginError("Cannot reach the server. Check your API URL settings.");
      } else {
        setLoginError(`Server error (${status}). Try again.`);
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = () => {
    clearAdminToken();
    setAuthenticated(false);
    setEmail("");
    setPassword("");
  };

  if (checking) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-white font-black text-2xl">Welcome back</h1>
            <p className="text-brand-muted text-sm mt-1">Sign in to your account</p>
          </div>
          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
              placeholder="Email address"
              autoComplete="email"
              required
              className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-white placeholder-brand-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30"
            />
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 pr-11 text-white placeholder-brand-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginError && (
              <p className="text-brand-red text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loggingIn || !email || !password}
              className="w-full bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loggingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminPanel onSignOut={handleSignOut} />;
}

function AdminPanel({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [applications, setApplications] = useState<PartnerApplication[]>(MOCK_APPLICATIONS);
  const [viewingApp, setViewingApp] = useState<PartnerApplication | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiStatus, setApiStatus] = useState<Record<string, any> | null>(null);
  const [apiStatusLoading, setApiStatusLoading] = useState(true);

  const [fixturesStatus, setFixturesStatus] = useState<ActionStatus>("idle");
  const [predictionsStatus, setPredictionsStatus] = useState<ActionStatus>("idle");
  const [resultsStatus, setResultsStatus] = useState<ActionStatus>("idle");

  const [bundleStatuses, setBundleStatuses] = useState<Record<string, ActionStatus>>({
    safe: "idle", medium: "idle", high: "idle", mega: "idle",
  });
  const [adminBundles, setAdminBundles] = useState<any[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);

  useEffect(() => {
    fetchAdminStats()
      .then((data) => setStats(data))
      .catch(() => toast.error("Could not load admin stats."))
      .finally(() => setStatsLoading(false));

    fetchApiStatus()
      .then((data) => setApiStatus(data))
      .catch(() => null)
      .finally(() => setApiStatusLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "users") {
      setUsersLoading(true);
      fetchAdminUsers()
        .then((data) => setUsers(data))
        .catch(() => toast.error("Could not load users."))
        .finally(() => setUsersLoading(false));
    }
    if (tab === "bundles") {
      setBundlesLoading(true);
      fetchAdminBundles()
        .then((data) => setAdminBundles(data))
        .catch(() => toast.error("Could not load bundles."))
        .finally(() => setBundlesLoading(false));
    }
  }, [tab]);

  const runAction = async (action: () => Promise<unknown>, setStatus: (s: ActionStatus) => void, label: string) => {
    setStatus("loading");
    try {
      await action();
      setStatus("success");
      toast.success(`${label} completed!`);
      // Refresh stats after a successful action
      fetchAdminStats().then((data) => setStats(data)).catch(() => null);
    } catch {
      setStatus("error");
      toast.error(`${label} failed.`);
    }
  };

  const updateAppStatus = (id: string, status: PartnerStatus) => {
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    setViewingApp(null);
    toast.success(`Application ${status}`);
  };

  const StatusIcon = ({ status }: { status: ActionStatus }) => {
    if (status === "loading") return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status === "success") return <CheckCircle className="w-4 h-4 text-brand-green" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-brand-red" />;
    return <Play className="w-4 h-4" />;
  };

  const handleToggleBundleActive = async (bundleId: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await deactivateBundle(bundleId);
        toast.success("Bundle unpublished — no longer visible to users.");
      } else {
        await activateBundle(bundleId);
        toast.success("Bundle published — now visible to users.");
      }
      fetchAdminBundles().then(setAdminBundles).catch(() => null);
    } catch {
      toast.error("Could not update bundle status.");
    }
  };

  const handleGenerateBundle = async (tier: string) => {
    setBundleStatuses((prev) => ({ ...prev, [tier]: "loading" }));
    try {
      const res = await generateBundle(tier);
      setBundleStatuses((prev) => ({ ...prev, [tier]: "success" }));
      toast.success(`${tier.toUpperCase()} bundle generated! ${res.bundle.total_odds}x odds, ${res.bundle.pick_count} picks.`);
      fetchAdminBundles().then(setAdminBundles).catch(() => null);
    } catch (err: any) {
      setBundleStatuses((prev) => ({ ...prev, [tier]: "error" }));
      const msg = err?.response?.data?.detail || `Bundle generation failed for ${tier}.`;
      toast.error(msg);
    }
  };

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const overviewCards = stats ? [
    { label: "Total Fixtures", value: stats.total_fixtures.toLocaleString(), icon: Database, color: "text-white" },
    { label: "Today's Matches", value: stats.today_fixtures.toLocaleString(), icon: BarChart2, color: "text-brand-yellow" },
    { label: "Today Predictions", value: stats.today_predictions.toLocaleString(), icon: Zap, color: "text-brand-green" },
    { label: "Total Users", value: stats.total_users.toLocaleString(), icon: Users, color: "text-brand-red" },
  ] : [];

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-black text-2xl">Admin Panel</h1>
          <div className="flex items-center gap-3">
            {stats && (
              <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${stats.api_key_configured ? "bg-green-950 border-green-900 text-brand-green" : "bg-red-950 border-red-900 text-brand-red"}`}>
                {stats.api_key_configured ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {stats.api_key_configured ? "API key connected" : "API key not set"}
              </div>
            )}
            <button
              onClick={onSignOut}
              className="text-xs text-brand-muted hover:text-white border border-brand-border hover:border-brand-muted px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-brand-card border border-brand-border rounded-lg p-1 mb-8 overflow-x-auto">
          {([
            { id: "overview", label: "Overview" },
            { id: "bundles", label: "🔥 Bundles" },
            { id: "partners", label: `Partners${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { id: "users", label: "Users" },
          ] as { id: AdminTab; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap ${tab === id ? "bg-brand-red text-white" : "text-brand-muted hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <>
            {statsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {overviewCards.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-brand-card border border-brand-border rounded-xl p-4">
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <div className={`text-2xl font-black ${color}`}>{value}</div>
                    <div className="text-brand-muted text-xs mt-1">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Football-Data.org Live Status */}
            <div className="mb-6 bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Data Source Status</h2>
                  <p className="text-brand-muted text-xs mt-0.5">football-data.org · fetches every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)</p>
                </div>
                {!apiStatusLoading && apiStatus && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    !apiStatus.api_key_set
                      ? "bg-yellow-950 text-brand-yellow border-yellow-900"
                      : apiStatus.available
                        ? "bg-green-950 text-brand-green border-green-900"
                        : "bg-red-950 text-brand-red border-red-900"
                  }`}>
                    {!apiStatus.api_key_set ? "NO KEY" : apiStatus.available ? "ACTIVE" : "LIMIT REACHED"}
                  </span>
                )}
              </div>

              {apiStatusLoading ? (
                <div className="flex items-center gap-2 text-brand-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking data source status...
                </div>
              ) : apiStatus ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Season", value: apiStatus.season?.toString() ?? "—", color: "text-white" },
                      { label: "Daily Calls Used", value: apiStatus.daily_used != null ? `${apiStatus.daily_used}/${apiStatus.daily_limit}` : "—", color: (apiStatus.daily_used ?? 0) >= (apiStatus.daily_limit ?? 20) ? "text-brand-red" : "text-brand-green" },
                      { label: "Remaining Today", value: apiStatus.remaining != null ? `${apiStatus.remaining}` : "—", color: (apiStatus.remaining ?? 20) <= 4 ? "text-brand-red" : "text-brand-green" },
                      { label: "Poll Interval", value: apiStatus.poll_interval_hours != null ? `Every ${apiStatus.poll_interval_hours}h` : "Every 6h", color: "text-brand-yellow" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-brand-dark border border-brand-border rounded-lg p-3">
                        <p className="text-brand-muted text-[10px] uppercase font-bold mb-1">{label}</p>
                        <p className={`text-lg font-black ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {!apiStatus.api_key_set && (
                    <div className="bg-yellow-950 border border-yellow-900 rounded-lg p-4 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-brand-yellow shrink-0 mt-0.5" />
                      <div>
                        <p className="text-brand-yellow font-bold text-sm">API key not configured</p>
                        <p className="text-yellow-400 text-xs mt-1 leading-relaxed">
                          Add <code className="bg-yellow-900/50 px-1 rounded">FOOTBALL_DATA_API_KEY</code> to your environment secrets.
                          Get a free key at{" "}
                          <a href="https://www.football-data.org/client/register" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                            football-data.org/client/register
                          </a>{" "}
                          — the free plan includes Premier League, La Liga, Serie A, and Bundesliga.
                        </p>
                      </div>
                    </div>
                  )}

                  {apiStatus.api_key_set && !apiStatus.available && (
                    <div className="bg-red-950 border border-red-900 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                      <p className="text-red-300 text-xs">
                        Daily request limit reached ({apiStatus.daily_limit} calls). The scheduler will pause until midnight UTC when the counter resets automatically.
                      </p>
                    </div>
                  )}

                  {apiStatus.api_key_set && apiStatus.available && (
                    <div className="bg-green-950/30 border border-green-900/30 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                      <p className="text-green-300 text-xs">
                        Data source is healthy. Fixtures are fetched every 6 hours (1 API call per run, 4 calls/day max).
                        Season {apiStatus.season} is active — Premier League, La Liga, Serie A, and Bundesliga are tracked.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-brand-muted text-sm">Could not load data source status.</p>
              )}
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <h2 className="text-white font-bold text-lg mb-4">Automation Controls</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { label: "Update Fixtures", desc: "Fetch latest fixtures from football-data.org (2 API calls)", status: fixturesStatus, action: () => runAction(triggerUpdateFixtures, setFixturesStatus, "Update Fixtures") },
                  { label: "Run Predictions", desc: "Generate predictions from DB form data (no API calls)", status: predictionsStatus, action: () => runAction(triggerRunPredictions, setPredictionsStatus, "Run Predictions") },
                  { label: "Update Results", desc: "Reconcile finished match results from DB", status: resultsStatus, action: () => runAction(triggerUpdateResults, setResultsStatus, "Update Results") },
                ].map(({ label, desc, status, action }) => (
                  <div key={label} className="bg-brand-dark border border-brand-border rounded-lg p-4">
                    <p className="text-white font-bold text-sm mb-1">{label}</p>
                    <p className="text-brand-muted text-xs mb-3">{desc}</p>
                    <button
                      onClick={action}
                      disabled={status === "loading"}
                      className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2 rounded transition-colors"
                    >
                      <StatusIcon status={status} />
                      {status === "loading" ? "Running..." : "Run Now"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* BUNDLES TAB */}
        {tab === "bundles" && (
          <>
            {/* Generate Buttons */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
              <h2 className="text-white font-bold text-lg mb-1">Generate Bundles</h2>
              <p className="text-brand-muted text-xs mb-5">
                Each generation deactivates the current bundle of that tier and replaces it with a fresh one built from today&apos;s predictions.
                Run predictions first if the pool is empty.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { tier: "safe",   label: "Safe Slip",   icon: Shield,    color: "text-brand-green",  odds: "5–10x",    price: "$10" },
                  { tier: "medium", label: "Medium Slip", icon: TrendingUp, color: "text-blue-400",    odds: "20–50x",   price: "$20" },
                  { tier: "high",   label: "High Roller", icon: Zap,       color: "text-brand-yellow", odds: "100–300x", price: "$30" },
                  { tier: "mega",   label: "Mega Slip",   icon: Flame,     color: "text-brand-red",    odds: "500–1000x", price: "$50" },
                ] as { tier: string; label: string; icon: React.ElementType; color: string; odds: string; price: string }[]).map(({ tier, label, icon: Icon, color, odds, price }) => {
                  const status = bundleStatuses[tier];
                  return (
                    <div key={tier} className="bg-brand-dark border border-brand-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <p className="text-white font-bold text-sm">{label}</p>
                      </div>
                      <p className={`text-xs font-black mb-0.5 ${color}`}>{odds} odds</p>
                      <p className="text-brand-muted text-[10px] mb-3">{price} per bundle</p>
                      <button
                        onClick={() => handleGenerateBundle(tier)}
                        disabled={status === "loading"}
                        className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                      >
                        {status === "loading" ? (
                          <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                        ) : status === "success" ? (
                          <><CheckCircle className="w-3.5 h-3.5 text-white" /> Generated!</>
                        ) : status === "error" ? (
                          <><AlertCircle className="w-3.5 h-3.5" /> Retry</>
                        ) : (
                          <><Play className="w-3.5 h-3.5" /> Generate</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bundle List */}
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
                <h2 className="text-white font-bold">All Bundles</h2>
                <button
                  onClick={() => {
                    setBundlesLoading(true);
                    fetchAdminBundles().then(setAdminBundles).catch(() => null).finally(() => setBundlesLoading(false));
                  }}
                  className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white border border-brand-border rounded px-3 py-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {bundlesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                </div>
              ) : adminBundles.length === 0 ? (
                <div className="px-5 py-10 text-center text-brand-muted text-sm">
                  No bundles generated yet. Use the buttons above to create your first bundle.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Bundle</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Tier</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Odds</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Picks</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Price</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Status</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Created</th>
                        <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {adminBundles.map((b) => (
                        <tr key={b.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-white text-sm font-bold truncate max-w-[200px]">{b.name}</p>
                            <p className="text-brand-muted text-[10px] font-mono">{b.id.slice(0, 8)}…</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              b.tier === "safe" ? "bg-green-950 text-brand-green border-green-900" :
                              b.tier === "medium" ? "bg-blue-950 text-blue-400 border-blue-900" :
                              b.tier === "high" ? "bg-yellow-950 text-brand-yellow border-yellow-900" :
                              "bg-red-950 text-brand-red border-red-900"
                            }`}>{b.tier}</span>
                          </td>
                          <td className="px-5 py-3 text-white font-bold text-sm">{b.total_odds}x</td>
                          <td className="px-5 py-3 text-brand-muted text-sm">{b.pick_count}</td>
                          <td className="px-5 py-3 text-white text-sm font-bold">${b.price}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${b.is_active ? "bg-green-950 text-brand-green border-green-900" : "bg-gray-900 text-gray-500 border-gray-700"}`}>
                              {b.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-brand-muted text-xs">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => handleToggleBundleActive(b.id, b.is_active)}
                              className={`text-[10px] font-black px-3 py-1 rounded border transition-colors ${
                                b.is_active
                                  ? "bg-red-950 border-red-900 text-brand-red hover:bg-red-900"
                                  : "bg-green-950 border-green-900 text-brand-green hover:bg-green-900"
                              }`}
                            >
                              {b.is_active ? "Unpublish" : "Publish"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* PARTNERS TAB */}
        {tab === "partners" && (
          <>
            {/* Review Modal */}
            {viewingApp && (
              <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                <div className="bg-brand-darker border border-brand-border rounded-xl w-full max-w-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-black text-lg">{viewingApp.name}</h3>
                      <p className="text-brand-muted text-xs">{viewingApp.email}</p>
                    </div>
                    <StatusBadge status={viewingApp.status} />
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-brand-dark border border-brand-border rounded-lg p-3">
                        <p className="text-brand-muted text-[10px] uppercase font-bold mb-1">Platform</p>
                        <p className="text-white text-sm font-bold capitalize">{viewingApp.platform}</p>
                      </div>
                      <div className="bg-brand-dark border border-brand-border rounded-lg p-3">
                        <p className="text-brand-muted text-[10px] uppercase font-bold mb-1">Handle</p>
                        <p className="text-white text-sm font-bold">@{viewingApp.handle}</p>
                      </div>
                      <div className="bg-brand-dark border border-brand-border rounded-lg p-3 col-span-2">
                        <p className="text-brand-muted text-[10px] uppercase font-bold mb-1">Followers</p>
                        <p className="text-white text-sm font-bold">{viewingApp.followers}</p>
                      </div>
                    </div>
                    <div className="bg-brand-dark border border-brand-border rounded-lg p-3">
                      <p className="text-brand-muted text-[10px] uppercase font-bold mb-1">Why they want to partner</p>
                      <p className="text-white text-xs leading-relaxed">{viewingApp.why}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-brand-muted text-xs">
                      <Clock className="w-3 h-3" />
                      Submitted: {viewingApp.submittedAt}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewingApp(null)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-brand-muted hover:text-white text-sm font-bold transition-colors">
                      Close
                    </button>
                    {viewingApp.status !== "rejected" && (
                      <button onClick={() => updateAppStatus(viewingApp.id, "rejected")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-950 border border-red-900 text-brand-red hover:bg-red-900 text-sm font-bold transition-colors">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    )}
                    {viewingApp.status !== "approved" && (
                      <button onClick={() => updateAppStatus(viewingApp.id, "approved")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-950 border border-green-900 text-brand-green hover:bg-green-900 text-sm font-bold transition-colors">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Pending Review", value: applications.filter((a) => a.status === "pending").length, color: "text-brand-yellow" },
                { label: "Approved Partners", value: applications.filter((a) => a.status === "approved").length, color: "text-brand-green" },
                { label: "Rejected", value: applications.filter((a) => a.status === "rejected").length, color: "text-brand-red" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-brand-card border border-brand-border rounded-xl p-4 text-center">
                  <div className={`text-3xl font-black ${color} mb-1`}>{value}</div>
                  <div className="text-brand-muted text-xs">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-border">
                <h2 className="text-white font-bold">Partner Applications</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Applicant</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Platform</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Followers</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Submitted</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Status</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {applications.map((app) => {
                      const PlatformIcon = PLATFORM_ICONS[app.platform] || Users;
                      return (
                        <tr key={app.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-white text-sm font-bold">{app.name}</p>
                            <p className="text-brand-muted text-xs">{app.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5 text-brand-muted text-sm">
                              <PlatformIcon className="w-3.5 h-3.5" />
                              <span className="capitalize text-xs">{app.platform}</span>
                            </div>
                            <p className="text-brand-muted text-[10px] mt-0.5">@{app.handle}</p>
                          </td>
                          <td className="px-5 py-3 text-white text-xs font-medium">{app.followers}</td>
                          <td className="px-5 py-3 text-brand-muted text-xs">{app.submittedAt}</td>
                          <td className="px-5 py-3"><StatusBadge status={app.status} /></td>
                          <td className="px-5 py-3">
                            <button onClick={() => setViewingApp(app)} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white border border-brand-border hover:border-gray-500 rounded px-3 py-1.5 transition-colors">
                              <Eye className="w-3 h-3" /> Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Users</h2>
              {stats && (
                <div className="flex items-center gap-4 text-xs text-brand-muted">
                  <span><span className="text-white font-bold">{stats.total_users}</span> total</span>
                  <span><span className="text-brand-green font-bold">{stats.paid_users}</span> paid</span>
                  <span><span className="text-brand-muted font-bold">{stats.free_users}</span> free</span>
                </div>
              )}
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="px-5 py-10 text-center text-brand-muted text-sm">
                No users registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Email</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Status</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Referral Code</th>
                      <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3 text-sm text-white">{user.email}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${user.isPaid ? "bg-green-950 text-brand-green border-green-900" : "bg-brand-dark text-brand-muted border-brand-border"}`}>
                            {user.isPaid ? "PAID" : "FREE"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-brand-muted text-xs font-mono">{user.referralCode}</td>
                        <td className="px-5 py-3 text-sm text-brand-muted">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
