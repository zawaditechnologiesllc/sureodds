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
  Crown,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Plus,
  DollarSign,
  TrendingDown,
  Package,
  Layers,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Filter,
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
  fetchAdminFinanceSummary,
  fetchAdminFinanceTransactions,
  fetchAdminFinanceEarnings,
  markEarningPaid,
  bulkMarkEarningsPaid,
  fetchAdminVipPackages,
  updateAdminVipPackage,
  fetchAdminVipAccess,
  fetchAdminPackages,
  updateAdminPackage,
  testAdminEmail,
  syncAdminUsers,
} from "@/lib/api";

type AdminTab = "overview" | "bundles" | "partners" | "users" | "payments" | "notifications" | "finance" | "vip" | "packages";
type ActionStatus = "idle" | "loading" | "success" | "error";
type PartnerStatus = "pending" | "approved" | "rejected";

interface AdminStats {
  total_users: number;
  paid_users: number;
  free_users: number;
  today_predictions: number;
  total_fixtures: number;
  today_fixtures: number;
  scheduled_today: number;
  scheduled_tomorrow: number;
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
  const [syncingUsers, setSyncingUsers] = useState(false);
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

  // Finance
  const [financeSummary, setFinanceSummary] = useState<Record<string, number> | null>(null);
  const [financeSummaryLoading, setFinanceSummaryLoading] = useState(false);
  const [financeTransactions, setFinanceTransactions] = useState<any[]>([]);
  const [financeTransactionsLoading, setFinanceTransactionsLoading] = useState(false);
  const [financeEarnings, setFinanceEarnings] = useState<any[]>([]);
  const [financeEarningsLoading, setFinanceEarningsLoading] = useState(false);
  const [txnStatusFilter, setTxnStatusFilter] = useState<string>("");
  const [payingEarningId, setPayingEarningId] = useState<number | null>(null);
  const [selectedEarningIds, setSelectedEarningIds] = useState<number[]>([]);

  // VIP
  const [vipPackages, setVipPackages] = useState<any[]>([]);
  const [vipPackagesLoading, setVipPackagesLoading] = useState(false);
  const [vipAccess, setVipAccess] = useState<any[]>([]);
  const [vipAccessLoading, setVipAccessLoading] = useState(false);
  const [editingVipId, setEditingVipId] = useState<number | null>(null);
  const [vipEditPrice, setVipEditPrice] = useState<string>("");
  const [vipEditName, setVipEditName] = useState<string>("");
  const [vipEditFeatures, setVipEditFeatures] = useState<string>("");

  // Value Packs (pick credit packages)
  const [valuePacks, setValuePacks] = useState<any[]>([]);
  const [valuePacksLoading, setValuePacksLoading] = useState(false);
  const [editingPackId, setEditingPackId] = useState<number | null>(null);
  const [packEditPrice, setPackEditPrice] = useState<string>("");
  const [packEditPicks, setPackEditPicks] = useState<string>("");

  // Email settings / test
  const [testEmailTo, setTestEmailTo] = useState<string>("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ sent: boolean; reason?: string; smtp_host?: string; smtp_user?: string } | null>(null);

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
    if (tab === "finance") {
      setFinanceSummaryLoading(true);
      setFinanceTransactionsLoading(true);
      setFinanceEarningsLoading(true);
      fetchAdminFinanceSummary()
        .then(setFinanceSummary)
        .catch(() => toast.error("Could not load finance summary."))
        .finally(() => setFinanceSummaryLoading(false));
      fetchAdminFinanceTransactions()
        .then(setFinanceTransactions)
        .catch(() => toast.error("Could not load transactions."))
        .finally(() => setFinanceTransactionsLoading(false));
      fetchAdminFinanceEarnings()
        .then(setFinanceEarnings)
        .catch(() => toast.error("Could not load partner earnings."))
        .finally(() => setFinanceEarningsLoading(false));
    }
    if (tab === "vip") {
      setVipPackagesLoading(true);
      setVipAccessLoading(true);
      fetchAdminVipPackages()
        .then(setVipPackages)
        .catch(() => null)
        .finally(() => setVipPackagesLoading(false));
      fetchAdminVipAccess()
        .then(setVipAccess)
        .catch(() => null)
        .finally(() => setVipAccessLoading(false));
    }
    if (tab === "packages") {
      setValuePacksLoading(true);
      fetchAdminPackages()
        .then(setValuePacks)
        .catch(() => null)
        .finally(() => setValuePacksLoading(false));
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

  const handleMarkEarningPaid = async (earningId: number) => {
    setPayingEarningId(earningId);
    try {
      await markEarningPaid(earningId);
      setFinanceEarnings((prev) => prev.map((e) => e.id === earningId ? { ...e, status: "paid", paid_at: new Date().toISOString() } : e));
      toast.success("Earning marked as paid.");
    } catch {
      toast.error("Could not mark as paid.");
    } finally {
      setPayingEarningId(null);
    }
  };

  const handleBulkPay = async () => {
    if (selectedEarningIds.length === 0) return;
    try {
      const res = await bulkMarkEarningsPaid(selectedEarningIds);
      toast.success(`${res.updated} earning(s) marked as paid.`);
      setFinanceEarnings((prev) => prev.map((e) => selectedEarningIds.includes(e.id) ? { ...e, status: "paid", paid_at: new Date().toISOString() } : e));
      setSelectedEarningIds([]);
    } catch {
      toast.error("Bulk pay failed.");
    }
  };

  const handleFilterTransactions = async (status: string) => {
    setTxnStatusFilter(status);
    setFinanceTransactionsLoading(true);
    try {
      const data = await fetchAdminFinanceTransactions(status || undefined);
      setFinanceTransactions(data);
    } catch {
      toast.error("Could not filter transactions.");
    } finally {
      setFinanceTransactionsLoading(false);
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
    { label: "Total Fixtures in DB", value: stats.total_fixtures.toLocaleString(), icon: Database, color: "text-white" },
    {
      label: "Visible to Users Today",
      value: (stats.scheduled_today ?? stats.today_fixtures).toLocaleString(),
      icon: BarChart2,
      color: stats.scheduled_today > 0 ? "text-brand-green" : "text-brand-red",
    },
    {
      label: "Tomorrow (Visible)",
      value: (stats.scheduled_tomorrow ?? 0).toLocaleString(),
      icon: Zap,
      color: "text-brand-yellow",
    },
    { label: "Total Users", value: stats.total_users.toLocaleString(), icon: Users, color: "text-brand-red" },
  ] : [];

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-black text-2xl">Admin Panel</h1>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border bg-green-950 border-green-900 text-brand-green">
                <CheckCircle className="w-3.5 h-3.5" />
                Sofascore connected
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
            { id: "vip", label: "👑 VIP Access" },
            { id: "packages", label: "💳 Value Packs" },
            { id: "finance", label: "💰 Finance" },
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
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {overviewCards.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-brand-card border border-brand-border rounded-xl p-4">
                      <Icon className={`w-5 h-5 ${color} mb-2`} />
                      <div className={`text-2xl font-black ${color}`}>{value}</div>
                      <div className="text-brand-muted text-xs mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {stats && stats.scheduled_today === 0 && (
                  <div className="mb-6 bg-red-950/50 border border-red-900/60 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-bold text-sm">No predictions visible to users today</p>
                      <p className="text-red-400 text-xs mt-1">
                        All of today&apos;s fixtures are either finished or not yet in the DB. Users see 0 predictions.
                        Click <strong>Refresh Today</strong> below to scrape Sofascore and re-populate today&apos;s data.
                      </p>
                    </div>
                  </div>
                )}
                {stats && stats.scheduled_today > 0 && (
                  <div className="mb-6 bg-green-950/30 border border-green-900/30 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-brand-green shrink-0" />
                    <p className="text-green-300 text-xs">
                      <strong>{stats.scheduled_today}</strong> fixture{stats.scheduled_today !== 1 ? "s" : ""} visible to users today · {stats.scheduled_tomorrow ?? 0} tomorrow
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Data Source Status */}
            <div className="mb-6 bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Data Source Status</h2>
                  <p className="text-brand-muted text-xs mt-0.5">sofascore.com · fixtures refresh every 2 hours · live scores every 2 minutes</p>
                </div>
                {!apiStatusLoading && apiStatus && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-green-950 text-brand-green border-green-900">
                    ACTIVE
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
                      { label: "Source", value: "Sofascore", color: "text-brand-yellow" },
                      { label: "Fixtures Poll", value: "Every 2h", color: "text-brand-green" },
                      { label: "Live Scores", value: "Every 2min", color: "text-brand-green" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-brand-dark border border-brand-border rounded-lg p-3">
                        <p className="text-brand-muted text-[10px] uppercase font-bold mb-1">{label}</p>
                        <p className={`text-lg font-black ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-950/30 border border-green-900/30 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    <p className="text-green-300 text-xs">
                      Sofascore scraper is active — no API key required. Season {apiStatus.season} fixtures are loaded automatically.
                      Leagues covered: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, CAF CL, FKF Premier League, PSL, NPFL, and more.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-brand-muted text-sm">Could not load data source status.</p>
              )}
            </div>

            {/* Supabase User Sync */}
            <div className="bg-brand-card border border-blue-900/40 rounded-xl p-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Supabase User Sync
                  </h2>
                  <p className="text-brand-muted text-xs mt-1">
                    Pull all Supabase Auth users into the backend database. Run this if users show up in Supabase but are missing from the customer panel or user list.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSyncingUsers(true);
                    try {
                      const result = await syncAdminUsers();
                      toast.success(`Synced ${result.synced} new user${result.synced !== 1 ? "s" : ""} from Supabase (${result.already_present} already present).`);
                      fetchAdminUsers().then(setUsers).catch(() => null);
                    } catch {
                      toast.error("Sync failed. Check Supabase keys are set on the backend.");
                    } finally {
                      setSyncingUsers(false);
                    }
                  }}
                  disabled={syncingUsers}
                  className="flex items-center gap-2 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800/50 text-blue-400 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                >
                  {syncingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync from Supabase
                </button>
              </div>
            </div>

            {/* Automation Controls */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
              <h2 className="text-white font-bold text-lg mb-1">Automation Controls</h2>
              <p className="text-brand-muted text-xs mb-4">7-day rolling window. &quot;Fetch + Predict&quot; is the main action — it scrapes Sofascore AND generates predictions in one step.</p>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { label: "Fetch + Predict (7 days)", desc: "Scrapes Sofascore for the next 7 days AND generates predictions. Use this to populate data.", status: fixturesStatus, action: () => runAction(triggerUpdateFixtures, setFixturesStatus, "Fetch + Predict") },
                  { label: "Run Predictions Only", desc: "Generate predictions from fixtures already in DB — no scraping. Run after 'Fetch' if needed.", status: predictionsStatus, action: () => runAction(triggerRunPredictions, setPredictionsStatus, "Run Predictions") },
                  { label: "Update Results", desc: "Reconcile finished match results and accuracy scores from DB.", status: resultsStatus, action: () => runAction(triggerUpdateResults, setResultsStatus, "Update Results") },
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
              <p className="text-brand-muted text-xs mb-4">Scrapes Sofascore for that day, generates missing predictions, and reconciles results — all in one click.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-brand-dark border border-brand-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarCheck className="w-4 h-4 text-brand-green" />
                    <p className="text-white font-bold text-sm">Refresh Today</p>
                  </div>
                  <p className="text-brand-muted text-xs mb-3">Fetches today&apos;s fixtures from Sofascore, generates missing predictions, and reconciles results. Use this when users see 0 predictions.</p>
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

            {/* Email Settings */}
            <div className="mt-6 bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Email Notifications</h2>
                  <p className="text-brand-muted text-xs mt-0.5">Zoho SMTP · partner approval emails · referral alerts</p>
                </div>
                {testEmailResult !== null && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${testEmailResult.sent ? "bg-green-950 border-green-900 text-brand-green" : "bg-red-950 border-red-900 text-brand-red"}`}>
                    {testEmailResult.sent ? "SMTP OK" : "NOT CONFIGURED"}
                  </span>
                )}
              </div>

              {testEmailResult && !testEmailResult.sent && (
                <div className="bg-yellow-950 border border-yellow-900 rounded-lg p-4 mb-4 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-brand-yellow shrink-0 mt-0.5" />
                  <div>
                    <p className="text-brand-yellow font-bold text-sm mb-1">SMTP not configured</p>
                    <p className="text-yellow-400 text-xs leading-relaxed">
                      {testEmailResult.reason || "Add these environment variables in your Render dashboard → sure-odds backend → Environment:"}
                    </p>
                    <div className="mt-2 space-y-1 font-mono text-[11px] text-yellow-200">
                      <p>SMTP_HOST = smtp.zoho.com</p>
                      <p>SMTP_PORT = 587</p>
                      <p>SMTP_USER = info@sureodds.pro</p>
                      <p>SMTP_PASS = &lt;your Zoho app password&gt;</p>
                      <p>SMTP_FROM = Sure Odds &lt;info@sureodds.pro&gt;</p>
                    </div>
                    <p className="text-yellow-400 text-[11px] mt-2">After adding, redeploy the backend on Render for the variables to take effect.</p>
                  </div>
                </div>
              )}

              {testEmailResult && testEmailResult.sent && (
                <div className="bg-green-950/30 border border-green-900/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <p className="text-green-300 text-xs">
                    Test email sent via <strong>{testEmailResult.smtp_host}</strong> ({testEmailResult.smtp_user}). Check your inbox — if it arrived, partner approval emails are working.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white text-sm placeholder-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-red/30"
                />
                <button
                  onClick={async () => {
                    if (!testEmailTo.trim()) return;
                    setTestEmailLoading(true);
                    setTestEmailResult(null);
                    try {
                      const res = await testAdminEmail(testEmailTo.trim());
                      setTestEmailResult(res);
                      if (res.sent) toast.success("Test email sent! Check your inbox.");
                      else toast.error("SMTP not configured — see instructions below.");
                    } catch {
                      toast.error("Backend unreachable — if using Render free tier, it may be cold-starting. Wait 30s and try again.");
                    } finally {
                      setTestEmailLoading(false);
                    }
                  }}
                  disabled={testEmailLoading || !testEmailTo.trim()}
                  className="px-4 py-2 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {testEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {testEmailLoading ? "Sending…" : "Send Test"}
                </button>
              </div>
              <p className="text-brand-muted text-xs mt-2">
                Sends a test email to verify Zoho SMTP is connected. Partner approval emails fire automatically when you approve an application.
              </p>
            </div>
          </>
        )}

        {/* FINANCE TAB */}
        {tab === "finance" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            {financeSummaryLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-brand-red animate-spin" /></div>
            ) : financeSummary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Revenue", value: `$${financeSummary.total_revenue?.toFixed(2)}`, icon: DollarSign, color: "text-brand-green", bg: "bg-green-950/20", border: "border-green-900/30" },
                  { label: "Today's Revenue", value: `$${financeSummary.today_revenue?.toFixed(2)}`, icon: ArrowUpRight, color: "text-brand-yellow", bg: "bg-yellow-950/20", border: "border-yellow-900/30" },
                  { label: "Net Revenue", value: `$${financeSummary.net_revenue?.toFixed(2)}`, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-950/20", border: "border-blue-900/30" },
                  { label: "Pending Payments", value: `$${financeSummary.pending_revenue?.toFixed(2)}`, icon: Clock, color: "text-brand-red", bg: "bg-red-950/20", border: "border-red-900/30" },
                  { label: "Package Revenue", value: `$${financeSummary.package_revenue?.toFixed(2)}`, icon: Package, color: "text-white", bg: "bg-brand-dark", border: "border-brand-border" },
                  { label: "Bundle Revenue", value: `$${financeSummary.bundle_revenue?.toFixed(2)}`, icon: Layers, color: "text-white", bg: "bg-brand-dark", border: "border-brand-border" },
                  { label: "Partner Commissions", value: `$${financeSummary.total_commissions?.toFixed(2)}`, icon: Users, color: "text-brand-muted", bg: "bg-brand-dark", border: "border-brand-border" },
                  { label: "Pending Commissions", value: `$${financeSummary.pending_commissions?.toFixed(2)}`, icon: Banknote, color: "text-brand-yellow", bg: "bg-yellow-950/20", border: "border-yellow-900/30" },
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
            ) : null}

            {/* Paid-out commissions + pending */}
            {financeSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-brand-green shrink-0" />
                  <div>
                    <p className="text-brand-muted text-xs">Paid Commissions</p>
                    <p className="text-white font-black text-xl">${financeSummary.paid_commissions?.toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex items-center gap-3">
                  <CircleDollarSign className="w-8 h-8 text-brand-muted shrink-0" />
                  <div>
                    <p className="text-brand-muted text-xs">Total Transactions</p>
                    <p className="text-white font-black text-xl">{financeSummary.total_transactions}</p>
                  </div>
                </div>
                <div className="bg-yellow-950/20 border border-yellow-900/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-brand-yellow shrink-0" />
                  <div>
                    <p className="text-brand-muted text-xs">Pending Transactions</p>
                    <p className="text-white font-black text-xl">{financeSummary.pending_transactions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-green" />
                  <h2 className="text-white font-bold text-lg">All Transactions</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-brand-muted" />
                  {(["", "success", "pending", "failed"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleFilterTransactions(s)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        txnStatusFilter === s
                          ? "bg-brand-red border-red-700 text-white"
                          : "bg-brand-dark border-brand-border text-brand-muted hover:text-white"
                      }`}
                    >
                      {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  <button
                    onClick={() => handleFilterTransactions(txnStatusFilter)}
                    className="text-brand-muted hover:text-white"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {financeTransactionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-red animate-spin" /></div>
              ) : financeTransactions.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-8">No transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-brand-muted text-xs uppercase">
                        <th className="text-left py-2 pr-4 font-bold">User</th>
                        <th className="text-left py-2 pr-4 font-bold">Product</th>
                        <th className="text-left py-2 pr-4 font-bold">Type</th>
                        <th className="text-left py-2 pr-4 font-bold">Amount</th>
                        <th className="text-left py-2 pr-4 font-bold">Status</th>
                        <th className="text-left py-2 pr-4 font-bold">Reference</th>
                        <th className="text-left py-2 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                      {financeTransactions.map((t: any) => (
                        <tr key={`${t.type}-${t.id}`} className="hover:bg-brand-dark/30 transition-colors">
                          <td className="py-2.5 pr-4 text-white text-xs max-w-[140px] truncate">{t.user_email}</td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs max-w-[140px] truncate">{t.product}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${t.type === "package" ? "bg-blue-950 text-blue-400 border-blue-900" : "bg-yellow-950 text-brand-yellow border-yellow-900"}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-brand-green text-xs font-bold">${t.amount?.toFixed(2)}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                              t.status === "success" ? "bg-green-950 text-brand-green border-green-900"
                              : t.status === "pending" ? "bg-yellow-950 text-brand-yellow border-yellow-900"
                              : "bg-red-950 text-brand-red border-red-900"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-brand-muted text-[10px] font-mono">{t.reference}</td>
                          <td className="py-2.5 text-brand-muted text-xs whitespace-nowrap">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Partner Earnings Table */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-brand-yellow" />
                  <h2 className="text-white font-bold text-lg">Partner Commissions</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEarningIds.length > 0 && (
                    <button
                      onClick={handleBulkPay}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-brand-green hover:bg-green-600 text-black rounded transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Pay Selected ({selectedEarningIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFinanceEarningsLoading(true);
                      fetchAdminFinanceEarnings().then(setFinanceEarnings).catch(() => null).finally(() => setFinanceEarningsLoading(false));
                    }}
                    className="text-brand-muted hover:text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {financeEarningsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-red animate-spin" /></div>
              ) : financeEarnings.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-8">No partner earnings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-brand-muted text-xs uppercase">
                        <th className="text-left py-2 pr-3 font-bold w-5">
                          <input
                            type="checkbox"
                            className="accent-brand-red"
                            checked={selectedEarningIds.length === financeEarnings.filter((e: any) => e.status === "pending").length && financeEarnings.filter((e: any) => e.status === "pending").length > 0}
                            onChange={(ev) => {
                              if (ev.target.checked) {
                                setSelectedEarningIds(financeEarnings.filter((e: any) => e.status === "pending").map((e: any) => e.id));
                              } else {
                                setSelectedEarningIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="text-left py-2 pr-4 font-bold">Partner</th>
                        <th className="text-left py-2 pr-4 font-bold">Referred User</th>
                        <th className="text-left py-2 pr-4 font-bold">Commission</th>
                        <th className="text-left py-2 pr-4 font-bold">Rate</th>
                        <th className="text-left py-2 pr-4 font-bold">Payout</th>
                        <th className="text-left py-2 pr-4 font-bold">Status</th>
                        <th className="text-left py-2 pr-4 font-bold">Date</th>
                        <th className="text-left py-2 font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                      {financeEarnings.map((e: any) => (
                        <tr key={e.id} className="hover:bg-brand-dark/30 transition-colors">
                          <td className="py-2.5 pr-3">
                            {e.status === "pending" && (
                              <input
                                type="checkbox"
                                className="accent-brand-red"
                                checked={selectedEarningIds.includes(e.id)}
                                onChange={(ev) => {
                                  if (ev.target.checked) {
                                    setSelectedEarningIds((prev) => [...prev, e.id]);
                                  } else {
                                    setSelectedEarningIds((prev) => prev.filter((id) => id !== e.id));
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-white text-xs max-w-[130px] truncate">{e.partner_email}</td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs max-w-[130px] truncate">{e.referred_user_email}</td>
                          <td className="py-2.5 pr-4 text-brand-green text-xs font-black">${e.amount?.toFixed(2)}</td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs">{(e.commission_rate * 100).toFixed(0)}%</td>
                          <td className="py-2.5 pr-4 text-xs">
                            {e.payout_method === "usdt" ? (
                              <span className="text-brand-green font-bold">USDT TRC-20</span>
                            ) : e.payout_method === "bank" ? (
                              <span className="text-blue-400 font-bold">{e.bank_name || "Bank"}</span>
                            ) : (
                              <span className="text-brand-muted">—</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${e.status === "paid" ? "bg-green-950 text-brand-green border-green-900" : "bg-yellow-950 text-brand-yellow border-yellow-900"}`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs whitespace-nowrap">
                            {e.created_at ? new Date(e.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-2.5">
                            {e.status === "pending" ? (
                              <button
                                onClick={() => handleMarkEarningPaid(e.id)}
                                disabled={payingEarningId === e.id}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-brand-green hover:bg-green-600 disabled:opacity-60 text-black rounded transition-colors"
                              >
                                {payingEarningId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Pay
                              </button>
                            ) : (
                              <span className="text-brand-muted text-[10px]">
                                {e.paid_at ? new Date(e.paid_at).toLocaleDateString("en-GB") : "Paid"}
                              </span>
                            )}
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

        {/* VIP ACCESS TAB */}
        {tab === "vip" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                <Crown className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-white font-black text-xl">VIP Access Management</h2>
                <p className="text-brand-muted text-sm">Manage VIP packages, pricing, and active subscriptions.</p>
              </div>
            </div>

            {/* VIP Package Pricing Management */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-white font-bold text-lg">VIP Package Pricing</h2>
                </div>
                <button
                  onClick={() => {
                    setVipPackagesLoading(true);
                    fetchAdminVipPackages().then(setVipPackages).catch(() => null).finally(() => setVipPackagesLoading(false));
                  }}
                  className="text-brand-muted hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {vipPackagesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-brand-red animate-spin" /></div>
              ) : vipPackages.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-6">No VIP packages found. Restart the backend to seed them.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vipPackages.map((pkg: any) => (
                    <div key={pkg.id} className={`rounded-xl border p-4 ${pkg.is_active ? "border-yellow-700/40 bg-yellow-950/10" : "border-brand-border bg-brand-dark opacity-60"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-bold text-sm">{pkg.name}</p>
                          <p className="text-brand-muted text-xs mt-0.5">
                            {pkg.duration_days === 1 ? "1 Day" : pkg.duration_days === 7 ? "7 Days" : "30 Days"} · {pkg.currency}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${pkg.is_active ? "bg-green-950 text-brand-green border-green-900" : "bg-gray-900 text-brand-muted border-gray-800"}`}>
                          {pkg.is_active ? "Active" : "Off"}
                        </span>
                      </div>

                      {editingVipId === pkg.id ? (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-brand-muted text-xs w-14 shrink-0">Name</span>
                            <input
                              type="text"
                              value={vipEditName}
                              onChange={(e) => setVipEditName(e.target.value)}
                              className="flex-1 bg-brand-dark border border-brand-border rounded px-2 py-1.5 text-white text-sm"
                              placeholder="Package name"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-brand-muted text-xs w-14 shrink-0">Price</span>
                            <input
                              type="number"
                              value={vipEditPrice}
                              onChange={(e) => setVipEditPrice(e.target.value)}
                              className="flex-1 bg-brand-dark border border-brand-border rounded px-2 py-1.5 text-white text-sm"
                              placeholder="Price in KES"
                            />
                          </div>
                          <div>
                            <span className="text-brand-muted text-xs block mb-1">Features (one per line)</span>
                            <textarea
                              value={vipEditFeatures}
                              onChange={(e) => setVipEditFeatures(e.target.value)}
                              rows={3}
                              className="w-full bg-brand-dark border border-brand-border rounded px-2 py-1.5 text-white text-xs resize-none"
                              placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={async () => {
                                try {
                                  const features = vipEditFeatures.split("\n").map((f) => f.trim()).filter(Boolean);
                                  await updateAdminVipPackage(pkg.id, {
                                    name: vipEditName,
                                    price: parseFloat(vipEditPrice),
                                    features,
                                  });
                                  setVipPackages((prev) => prev.map((p) =>
                                    p.id === pkg.id
                                      ? { ...p, name: vipEditName, price: parseFloat(vipEditPrice), features }
                                      : p
                                  ));
                                  toast.success("VIP package updated.");
                                } catch { toast.error("Update failed."); }
                                setEditingVipId(null);
                              }}
                              className="flex-1 py-1.5 bg-brand-green hover:bg-green-600 text-black text-xs font-bold rounded transition-colors"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingVipId(null)} className="text-brand-muted hover:text-white px-2">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-yellow-400 font-black text-2xl">KSh {pkg.price?.toLocaleString()}</p>
                          <button
                            onClick={() => {
                              setEditingVipId(pkg.id);
                              setVipEditPrice(String(pkg.price));
                              setVipEditName(pkg.name || "");
                              setVipEditFeatures((pkg.features || []).join("\n"));
                            }}
                            className="text-brand-muted hover:text-white text-xs flex items-center gap-1 border border-brand-border rounded px-2 py-1 transition-colors hover:border-gray-500"
                          >
                            Edit
                          </button>
                        </div>
                      )}

                      {pkg.features?.length > 0 && (
                        <ul className="space-y-1 mb-3">
                          {pkg.features.map((f: string) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-brand-muted">
                              <CheckCircle className="w-3 h-3 text-brand-green shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        onClick={async () => {
                          try {
                            await updateAdminVipPackage(pkg.id, { is_active: !pkg.is_active });
                            setVipPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, is_active: !pkg.is_active } : p));
                            toast.success(`Package ${pkg.is_active ? "deactivated" : "activated"}.`);
                          } catch { toast.error("Toggle failed."); }
                        }}
                        className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${pkg.is_active ? "bg-red-950 hover:bg-red-900 text-brand-red border border-red-900" : "bg-green-950 hover:bg-green-900 text-brand-green border border-green-900"}`}
                      >
                        {pkg.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VIP Access Log */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-brand-green" />
                  <h2 className="text-white font-bold text-lg">VIP Access Log</h2>
                  {vipAccess.length > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-950/40 text-yellow-400 border border-yellow-500/30">
                      {vipAccess.filter((r: any) => r.is_active).length} active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setVipAccessLoading(true);
                    fetchAdminVipAccess().then(setVipAccess).catch(() => null).finally(() => setVipAccessLoading(false));
                  }}
                  className="text-brand-muted hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              {vipAccessLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-brand-red animate-spin" /></div>
              ) : vipAccess.length === 0 ? (
                <div className="text-center py-10">
                  <Crown className="w-10 h-10 text-brand-muted mx-auto mb-3 opacity-30" />
                  <p className="text-brand-muted text-sm">No VIP purchases yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-brand-muted text-xs uppercase">
                        <th className="text-left py-2 pr-4 font-bold">User</th>
                        <th className="text-left py-2 pr-4 font-bold">Package</th>
                        <th className="text-left py-2 pr-4 font-bold">Activated</th>
                        <th className="text-left py-2 pr-4 font-bold">Expires</th>
                        <th className="text-left py-2 pr-4 font-bold">Status</th>
                        <th className="text-left py-2 font-bold">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                      {vipAccess.map((r: any) => (
                        <tr key={r.id} className="hover:bg-brand-dark/30 transition-colors">
                          <td className="py-2.5 pr-4 text-white text-xs max-w-[150px] truncate">{r.user_email}</td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs">{r.package_name}</td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs whitespace-nowrap">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-brand-muted text-xs whitespace-nowrap">
                            {r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${r.is_active ? "bg-green-950 text-brand-green border-green-900" : "bg-gray-900 text-brand-muted border-gray-800"}`}>
                              {r.is_active ? "Active" : "Expired"}
                            </span>
                          </td>
                          <td className="py-2.5 text-brand-muted text-[10px] font-mono max-w-[120px] truncate">{r.reference || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VALUE PACKS TAB */}
        {tab === "packages" && (
          <div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-green" />
                  <h2 className="text-white font-bold text-lg">Value Pack Pricing</h2>
                </div>
                <button
                  onClick={() => {
                    setValuePacksLoading(true);
                    fetchAdminPackages().then(setValuePacks).catch(() => null).finally(() => setValuePacksLoading(false));
                  }}
                  className="text-brand-muted hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-brand-muted text-xs mb-5">Edit price or pick count for each credit pack. Toggle active/inactive to show or hide from buyers.</p>

              {valuePacksLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-brand-green animate-spin" /></div>
              ) : valuePacks.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-6">No Value Packs found. Restart the backend to seed them.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {valuePacks.map((pkg: any) => (
                    <div key={pkg.id} className={`rounded-xl border p-4 ${pkg.is_active ? "border-brand-green/40 bg-green-950/10" : "border-brand-border bg-brand-dark opacity-60"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-bold text-sm">{pkg.name}</p>
                          <p className="text-brand-muted text-xs mt-0.5">{pkg.picks_count} picks · {pkg.currency}</p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${pkg.is_active ? "bg-green-950 text-brand-green border-green-900" : "bg-gray-900 text-brand-muted border-gray-800"}`}>
                          {pkg.is_active ? "Active" : "Off"}
                        </span>
                      </div>

                      {editingPackId === pkg.id ? (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-brand-muted text-xs w-12 shrink-0">Price</span>
                            <input
                              type="number"
                              step="0.01"
                              value={packEditPrice}
                              onChange={(e) => setPackEditPrice(e.target.value)}
                              className="flex-1 bg-brand-dark border border-brand-border rounded px-2 py-1.5 text-white text-sm"
                              placeholder="e.g. 4.99"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-brand-muted text-xs w-12 shrink-0">Picks</span>
                            <input
                              type="number"
                              value={packEditPicks}
                              onChange={(e) => setPackEditPicks(e.target.value)}
                              className="flex-1 bg-brand-dark border border-brand-border rounded px-2 py-1.5 text-white text-sm"
                              placeholder="e.g. 5"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={async () => {
                                try {
                                  await updateAdminPackage(pkg.id, {
                                    price: parseFloat(packEditPrice),
                                    picks_count: parseInt(packEditPicks),
                                  });
                                  setValuePacks((prev) => prev.map((p) =>
                                    p.id === pkg.id
                                      ? { ...p, price: parseFloat(packEditPrice), picks_count: parseInt(packEditPicks) }
                                      : p
                                  ));
                                  toast.success("Pack updated.");
                                } catch { toast.error("Update failed."); }
                                setEditingPackId(null);
                              }}
                              className="flex-1 py-1.5 bg-brand-green hover:bg-green-600 text-black text-xs font-bold rounded transition-colors"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingPackId(null)} className="text-brand-muted hover:text-white px-2">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-brand-green font-black text-2xl">${pkg.price?.toFixed(2)}</p>
                            <p className="text-brand-muted text-xs">${(pkg.price / pkg.picks_count).toFixed(2)} / pick</p>
                          </div>
                          <button
                            onClick={() => {
                              setEditingPackId(pkg.id);
                              setPackEditPrice(String(pkg.price));
                              setPackEditPicks(String(pkg.picks_count));
                            }}
                            className="text-brand-muted hover:text-white text-xs flex items-center gap-1 border border-brand-border rounded px-2 py-1 transition-colors hover:border-gray-500"
                          >
                            Edit
                          </button>
                        </div>
                      )}

                      {pkg.description && (
                        <p className="text-brand-muted text-xs mb-3 leading-relaxed">{pkg.description}</p>
                      )}

                      <button
                        onClick={async () => {
                          try {
                            await updateAdminPackage(pkg.id, { is_active: !pkg.is_active });
                            setValuePacks((prev) => prev.map((p) => p.id === pkg.id ? { ...p, is_active: !pkg.is_active } : p));
                            toast.success(`Pack ${pkg.is_active ? "deactivated" : "activated"}.`);
                          } catch { toast.error("Toggle failed."); }
                        }}
                        className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${pkg.is_active ? "bg-red-950 hover:bg-red-900 text-brand-red border border-red-900" : "bg-green-950 hover:bg-green-900 text-brand-green border border-green-900"}`}
                      >
                        {pkg.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-white font-bold text-lg">Users</h2>
              <div className="flex items-center gap-2">
                <span className="text-brand-muted text-xs">{users.length} loaded</span>
                <button
                  onClick={async () => {
                    setSyncingUsers(true);
                    try {
                      const result = await syncAdminUsers();
                      toast.success(`Synced ${result.synced} new user${result.synced !== 1 ? "s" : ""} from Supabase (${result.already_present} already present).`);
                      setUsersLoading(true);
                      fetchAdminUsers()
                        .then(setUsers)
                        .catch(() => toast.error("Could not reload users."))
                        .finally(() => setUsersLoading(false));
                    } catch {
                      toast.error("Sync failed. Check that Supabase is configured on the backend.");
                    } finally {
                      setSyncingUsers(false);
                    }
                  }}
                  disabled={syncingUsers}
                  className="flex items-center gap-1.5 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800/50 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {syncingUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync from Supabase
                </button>
              </div>
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
