"use client";

import { useState, useEffect } from "react";
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
  Clock,
  ExternalLink,
  Bell,
  CreditCard,
  CalendarCheck,
  CalendarDays,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  triggerUpdateFixtures,
  triggerRunPredictions,
  triggerUpdateResults,
  triggerTodayRefresh,
  triggerTomorrowRefresh,
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
  fetchAdminPartners,
  approvePartner,
  rejectPartner,
  fetchAdminPayments,
  confirmAdminPayment,
  fetchAdminNotifications,
  createAdminNotification,
  deleteAdminNotification,
  toggleAdminNotification,
} from "@/lib/api";

type AdminTab = "overview" | "bundles" | "partners" | "users" | "payments" | "notifications";
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
  website?: string;
  why: string;
  submittedAt: string;
  status: PartnerStatus;
}

interface AdminPayment {
  id: number;
  type: "package" | "bundle";
  user_id: string;
  amount: number;
  status: string;
  reference: string;
  package_id?: number;
  bundle_id?: string;
  created_at: string | null;
}

interface AdminNotification {
  id: number;
  title: string;
  message: string;
  target: string;
  is_active: boolean;
  created_at: string | null;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  telegram: Send,
  tiktok: BarChart2,
  other: Users,
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

const TARGET_BADGE: Record<string, string> = {
  users: "bg-blue-950 text-blue-400 border-blue-900",
  partners: "bg-purple-950 text-purple-400 border-purple-900",
  all: "bg-brand-card text-brand-muted border-brand-border",
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = getStoredAdminToken();
    if (!stored) { setChecking(false); return; }
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
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [viewingApp, setViewingApp] = useState<PartnerApplication | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<Record<string, any> | null>(null);
  const [apiStatusLoading, setApiStatusLoading] = useState(true);

  const [fixturesStatus, setFixturesStatus] = useState<ActionStatus>("idle");
  const [predictionsStatus, setPredictionsStatus] = useState<ActionStatus>("idle");
  const [resultsStatus, setResultsStatus] = useState<ActionStatus>("idle");
  const [todayStatus, setTodayStatus] = useState<ActionStatus>("idle");
  const [tomorrowStatus, setTomorrowStatus] = useState<ActionStatus>("idle");

  const [bundleStatuses, setBundleStatuses] = useState<Record<string, ActionStatus>>({
    safe: "idle", medium: "idle", high: "idle", mega: "idle",
  });
  const [adminBundles, setAdminBundles] = useState<any[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);

  // Payments
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [confirmingRef, setConfirmingRef] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifTarget, setNotifTarget] = useState("all");
  const [creatingNotif, setCreatingNotif] = useState(false);

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
    if (tab === "partners") {
      setPartnersLoading(true);
      fetchAdminPartners()
        .then((data) => setApplications(data))
        .catch(() => toast.error("Could not load partner applications."))
        .finally(() => setPartnersLoading(false));
    }
    if (tab === "payments") {
      setPaymentsLoading(true);
      fetchAdminPayments()
        .then((data) => setPayments(data))
        .catch(() => toast.error("Could not load payments."))
        .finally(() => setPaymentsLoading(false));
    }
    if (tab === "notifications") {
      setNotificationsLoading(true);
      fetchAdminNotifications()
        .then((data) => setNotifications(data))
        .catch(() => toast.error("Could not load notifications."))
        .finally(() => setNotificationsLoading(false));
    }
  }, [tab]);

  const runAction = async (action: () => Promise<unknown>, setStatus: (s: ActionStatus) => void, label: string) => {
    setStatus("loading");
    try {
      await action();
      setStatus("success");
      toast.success(`${label} completed!`);
      fetchAdminStats().then((data) => setStats(data)).catch(() => null);
    } catch {
      setStatus("error");
      toast.error(`${label} failed.`);
    }
  };

  const handleApprovePartner = async (id: string) => {
    try {
      await approvePartner(id);
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" as PartnerStatus } : a));
      setViewingApp(null);
      toast.success("Application approved.");
    } catch {
      toast.error("Could not approve application.");
    }
  };

  const handleRejectPartner = async (id: string) => {
    try {
      await rejectPartner(id);
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "rejected" as PartnerStatus } : a));
      setViewingApp(null);
      toast.success("Application rejected.");
    } catch {
      toast.error("Could not reject application.");
    }
  };

  const handleConfirmPayment = async (reference: string) => {
    setConfirmingRef(reference);
    try {
      await confirmAdminPayment(reference);
      toast.success("Payment confirmed — credits granted.");
      setPayments((prev) => prev.filter((p) => p.reference !== reference));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not confirm payment.");
    } finally {
      setConfirmingRef(null);
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setCreatingNotif(true);
    try {
      const created = await createAdminNotification({ title: notifTitle, message: notifMessage, target: notifTarget });
      setNotifications((prev) => [{ id: created.id, title: notifTitle, message: notifMessage, target: notifTarget, is_active: true, created_at: new Date().toISOString() }, ...prev]);
      setNotifTitle("");
      setNotifMessage("");
      setNotifTarget("all");
      toast.success("Notification created.");
    } catch {
      toast.error("Could not create notification.");
    } finally {
      setCreatingNotif(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted.");
    } catch {
      toast.error("Could not delete notification.");
    }
  };

  const handleToggleNotification = async (id: number) => {
    try {
      const res = await toggleAdminNotification(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_active: res.is_active } : n));
    } catch {
      toast.error("Could not toggle notification.");
    }
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
  const pendingPaymentsCount = payments.length;

  const overviewCards = stats ? [
    { label: "Total Fixtures", value: stats.total_fixtures.toLocaleString(), icon: Database, color: "text-white" },
    { label: "Today's Matches", value: stats.today_fixtures.toLocaleString(), icon: BarChart2, color: "text-brand-yellow" },
    { label: "Today Predictions", value: stats.today_predictions.toLocaleString(), icon: Zap, color: "text-brand-green" },
    { label: "Total Users", value: stats.total_users.toLocaleString(), icon: Users, color: "text-brand-red" },
  ] : [];

  return (
    <div className="min-h-screen bg-brand-dark">
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
            { id: "payments", label: `Payments${pendingPaymentsCount > 0 ? ` (${pendingPaymentsCount})` : ""}` },
            { id: "notifications", label: "Notifications" },
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

            {/* Data Source Status */}
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

            {/* Automation Controls */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
              <h2 className="text-white font-bold text-lg mb-1">Automation Controls</h2>
              <p className="text-brand-muted text-xs mb-4">Full range (14-day window). Use targeted buttons below if only today or tomorrow needs refreshing.</p>
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

            {/* Targeted Day Refresh */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <h2 className="text-white font-bold text-lg mb-1">Targeted Day Refresh</h2>
              <p className="text-brand-muted text-xs mb-4">Quickly refresh predictions and results for a specific day without running the full 14-day pipeline.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-brand-dark border border-brand-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarCheck className="w-4 h-4 text-brand-green" />
                    <p className="text-white font-bold text-sm">Refresh Today</p>
                  </div>
                  <p className="text-brand-muted text-xs mb-3">Fills missing predictions for today&apos;s fixtures and reconciles any finished results.</p>
                  <button
                    onClick={() => runAction(triggerTodayRefresh, setTodayStatus, "Today Refresh")}
                    disabled={todayStatus === "loading"}
                    className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-green-600 disabled:opacity-60 text-black text-sm font-bold py-2 rounded transition-colors"
                  >
                    <StatusIcon status={todayStatus} />
                    {todayStatus === "loading" ? "Running..." : "Refresh Today"}
                  </button>
                </div>
                <div className="bg-brand-dark border border-brand-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-brand-yellow" />
                    <p className="text-white font-bold text-sm">Refresh Tomorrow</p>
                  </div>
                  <p className="text-brand-muted text-xs mb-3">Fills missing predictions for tomorrow&apos;s scheduled fixtures (no results, games haven&apos;t started).</p>
                  <button
                    onClick={() => runAction(triggerTomorrowRefresh, setTomorrowStatus, "Tomorrow Refresh")}
                    disabled={tomorrowStatus === "loading"}
                    className="w-full flex items-center justify-center gap-2 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-60 text-black text-sm font-bold py-2 rounded transition-colors"
                  >
                    <StatusIcon status={tomorrowStatus} />
                    {tomorrowStatus === "loading" ? "Running..." : "Refresh Tomorrow"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* BUNDLES TAB */}
        {tab === "bundles" && (
          <>
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
                ] as const).map(({ tier, label, icon: Icon, color, odds, price }) => {
                  const status = bundleStatuses[tier];
                  return (
                    <div key={tier} className="bg-brand-dark border border-brand-border rounded-xl p-4">
                      <Icon className={`w-5 h-5 ${color} mb-2`} />
                      <p className="text-white font-bold text-sm mb-0.5">{label}</p>
                      <p className="text-brand-muted text-xs mb-0.5">{odds}</p>
                      <p className="text-brand-muted text-xs mb-3">{price}</p>
                      <button
                        onClick={() => handleGenerateBundle(tier)}
                        disabled={status === "loading"}
                        className="w-full flex items-center justify-center gap-1.5 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold py-2 rounded transition-colors"
                      >
                        {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        {status === "loading" ? "Generating..." : "Generate"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">All Bundles</h2>
                <button
                  onClick={() => {
                    setBundlesLoading(true);
                    fetchAdminBundles().then(setAdminBundles).catch(() => null).finally(() => setBundlesLoading(false));
                  }}
                  className="text-brand-muted hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {bundlesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                </div>
              ) : adminBundles.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-8">No bundles yet. Generate one above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        {["Name", "Tier", "Odds", "Picks", "Price", "Status", "Created", "Actions"].map((h) => (
                          <th key={h} className="text-left text-xs text-brand-muted font-medium py-2 pr-4 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {adminBundles.map((b) => (
                        <tr key={b.id}>
                          <td className="py-3 pr-4 text-white text-xs font-medium max-w-[160px] truncate">{b.name}</td>
                          <td className="py-3 pr-4 text-brand-muted text-xs capitalize">{b.tier}</td>
                          <td className="py-3 pr-4 text-brand-yellow text-xs font-bold">{b.total_odds}x</td>
                          <td className="py-3 pr-4 text-brand-muted text-xs">{b.pick_count}</td>
                          <td className="py-3 pr-4 text-white text-xs">${b.price}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${b.is_active ? "bg-green-950 text-brand-green border-green-900" : "bg-gray-900 text-gray-500 border-gray-700"}`}>
                              {b.is_active ? "Live" : "Hidden"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-brand-muted text-xs whitespace-nowrap">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleToggleBundleActive(b.id, b.is_active)}
                              className={`text-xs font-bold px-2.5 py-1 rounded border transition-colors ${
                                b.is_active
                                  ? "border-red-900 text-brand-red hover:bg-red-950"
                                  : "border-green-900 text-brand-green hover:bg-green-950"
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
            {viewingApp ? (
              <div className="bg-brand-card border border-brand-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">Application Detail</h2>
                  <button onClick={() => setViewingApp(null)} className="text-brand-muted hover:text-white text-sm">← Back</button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  {[
                    { label: "Name", value: viewingApp.name },
                    { label: "Email", value: viewingApp.email },
                    { label: "Platform", value: viewingApp.platform },
                    { label: "Handle", value: `@${viewingApp.handle}` },
                    { label: "Followers", value: viewingApp.followers },
                    { label: "Submitted", value: viewingApp.submittedAt ? new Date(viewingApp.submittedAt).toLocaleDateString("en-GB") : "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-brand-muted text-xs font-bold uppercase mb-1">{label}</p>
                      <p className="text-white text-sm">{value}</p>
                    </div>
                  ))}
                </div>
                {viewingApp.website && (
                  <div className="mb-4">
                    <p className="text-brand-muted text-xs font-bold uppercase mb-1">Website</p>
                    <a href={viewingApp.website} target="_blank" rel="noopener noreferrer" className="text-brand-red text-sm flex items-center gap-1 hover:underline">
                      {viewingApp.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-brand-muted text-xs font-bold uppercase mb-1">Why they want to partner</p>
                  <p className="text-white text-sm leading-relaxed bg-brand-dark border border-brand-border rounded-lg p-3">{viewingApp.why}</p>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <StatusBadge status={viewingApp.status} />
                </div>
                {viewingApp.status === "pending" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprovePartner(viewingApp.id)}
                      className="flex-1 bg-brand-green hover:bg-green-600 text-black font-black py-2.5 rounded-lg text-sm transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectPartner(viewingApp.id)}
                      className="flex-1 bg-red-950 hover:bg-red-900 border border-red-900 text-brand-red font-black py-2.5 rounded-lg text-sm transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-brand-card border border-brand-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">Partner Applications</h2>
                  <button
                    onClick={() => {
                      setPartnersLoading(true);
                      fetchAdminPartners().then(setApplications).catch(() => null).finally(() => setPartnersLoading(false));
                    }}
                    className="text-brand-muted hover:text-white text-xs flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>
                {partnersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                  </div>
                ) : applications.length === 0 ? (
                  <p className="text-brand-muted text-sm text-center py-8">No partner applications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => {
                      const Icon = PLATFORM_ICONS[app.platform] || Users;
                      return (
                        <div key={app.id} className="bg-brand-dark border border-brand-border rounded-lg p-4 flex items-center gap-4">
                          <div className="w-8 h-8 bg-brand-card border border-brand-border rounded-lg flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-brand-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white font-bold text-sm">{app.name}</p>
                              <StatusBadge status={app.status} />
                            </div>
                            <p className="text-brand-muted text-xs">
                              @{app.handle} · {app.followers} followers · {app.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-brand-muted text-xs hidden sm:block">
                              {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("en-GB") : ""}
                            </span>
                            <button
                              onClick={() => setViewingApp(app)}
                              className="text-xs font-bold px-3 py-1.5 border border-brand-border rounded-lg text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div className="bg-brand-card border border-brand-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Users</h2>
              <span className="text-brand-muted text-xs">{users.length} loaded</span>
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-8">No users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border">
                      {["Email", "Plan", "Referral Code", "Joined"].map((h) => (
                        <th key={h} className="text-left text-xs text-brand-muted font-medium py-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 pr-4 text-white text-xs">{u.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${u.isPaid ? "bg-yellow-950 text-brand-yellow border-yellow-900" : "bg-brand-dark text-brand-muted border-brand-border"}`}>
                            {u.isPaid ? "Premium" : "Free"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-brand-muted text-xs font-mono">{u.referralCode || "—"}</td>
                        <td className="py-3 text-brand-muted text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <div className="space-y-6">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-yellow" />
                  <h2 className="text-white font-bold text-lg">Pending &amp; Failed Payments</h2>
                </div>
                <button
                  onClick={() => {
                    setPaymentsLoading(true);
                    fetchAdminPayments().then(setPayments).catch(() => null).finally(() => setPaymentsLoading(false));
                  }}
                  className="text-brand-muted hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              <p className="text-brand-muted text-xs mb-5">
                These are payments that didn&apos;t update automatically. Confirm to manually credit the user and mark the transaction as successful.
              </p>
              {paymentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-8 h-8 text-brand-green mx-auto mb-3" />
                  <p className="text-white font-bold text-sm">All payments are up to date</p>
                  <p className="text-brand-muted text-xs mt-1">No pending or failed transactions found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border">
                        {["Reference", "Type", "Amount", "Status", "Date", "Action"].map((h) => (
                          <th key={h} className="text-left text-xs text-brand-muted font-medium py-2 pr-4 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {payments.map((p) => (
                        <tr key={p.reference}>
                          <td className="py-3 pr-4 text-white text-xs font-mono max-w-[140px] truncate" title={p.reference}>{p.reference}</td>
                          <td className="py-3 pr-4">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded border border-brand-border text-brand-muted uppercase">{p.type}</span>
                          </td>
                          <td className="py-3 pr-4 text-brand-yellow text-xs font-bold">KES {(p.amount).toLocaleString()}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${p.status === "pending" ? "bg-yellow-950 text-brand-yellow border-yellow-900" : "bg-red-950 text-brand-red border-red-900"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-brand-muted text-xs whitespace-nowrap">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleConfirmPayment(p.reference)}
                              disabled={confirmingRef === p.reference}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-brand-green hover:bg-green-600 disabled:opacity-60 text-black rounded transition-colors"
                            >
                              {confirmingRef === p.reference ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Confirm
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <div className="space-y-6">
            {/* Create notification form */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-brand-yellow" />
                <h2 className="text-white font-bold text-lg">Create Notification</h2>
              </div>
              <form onSubmit={handleCreateNotification} className="space-y-4">
                <div>
                  <label className="text-brand-muted text-xs font-bold uppercase mb-1.5 block">Title</label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Weekend predictions are live!"
                    required
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-brand-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30"
                  />
                </div>
                <div>
                  <label className="text-brand-muted text-xs font-bold uppercase mb-1.5 block">Message</label>
                  <textarea
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Write your notification message here..."
                    required
                    rows={3}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-brand-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 resize-none"
                  />
                </div>
                <div>
                  <label className="text-brand-muted text-xs font-bold uppercase mb-1.5 block">Target Audience</label>
                  <div className="flex gap-2">
                    {([
                      { value: "all", label: "Everyone" },
                      { value: "users", label: "Users only" },
                      { value: "partners", label: "Partners only" },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNotifTarget(value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                          notifTarget === value
                            ? "bg-brand-red border-red-700 text-white"
                            : "bg-brand-dark border-brand-border text-brand-muted hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creatingNotif || !notifTitle.trim() || !notifMessage.trim()}
                  className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors"
                >
                  {creatingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creatingNotif ? "Creating..." : "Create Notification"}
                </button>
              </form>
            </div>

            {/* Notification list */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">All Notifications</h2>
                <button
                  onClick={() => {
                    setNotificationsLoading(true);
                    fetchAdminNotifications().then(setNotifications).catch(() => null).finally(() => setNotificationsLoading(false));
                  }}
                  className="text-brand-muted hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {notificationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-8">No notifications yet. Create one above.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className={`bg-brand-dark border rounded-lg p-4 ${n.is_active ? "border-brand-border" : "border-brand-border opacity-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-white font-bold text-sm">{n.title}</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${TARGET_BADGE[n.target] ?? TARGET_BADGE.all}`}>
                              {n.target}
                            </span>
                            {!n.is_active && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded border border-gray-700 text-gray-500 uppercase">hidden</span>
                            )}
                          </div>
                          <p className="text-brand-muted text-xs leading-relaxed">{n.message}</p>
                          {n.created_at && (
                            <p className="text-brand-muted text-[10px] mt-1.5">
                              {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleNotification(n.id)}
                            className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
                            title={n.is_active ? "Hide notification" : "Show notification"}
                          >
                            {n.is_active ? <ToggleRight className="w-4 h-4 text-brand-green" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-red-900 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
