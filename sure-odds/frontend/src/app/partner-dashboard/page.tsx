"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  fetchPartnerStatus,
  fetchPartnerStats,
  fetchPartnerPayoutSettings,
  savePartnerPayoutSettings,
} from "@/lib/api";
import {
  Zap,
  Users,
  DollarSign,
  TrendingUp,
  Link2,
  Copy,
  CheckCircle,
  Clock,
  Wallet,
  Building2,
  ChevronDown,
  Loader2,
  AlertCircle,
  MousePointerClick,
  BarChart3,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

interface PartnerStatus {
  isPartner: boolean;
  name?: string;
  email: string;
  referralCode: string;
  referralLink: string;
  joinedAt?: string;
}

interface ReferralDetail {
  email: string;
  joinedAt: string;
  hasPurchased: boolean;
  totalSpent: number;
  commissionEarned: number;
}

interface PartnerStats {
  totalClicks: number;
  totalSignups: number;
  conversionRate: number;
  totalSales: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  referrals: ReferralDetail[];
}

interface PayoutSettings {
  method: string;
  usdt_address?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_swift?: string;
  bank_country?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "red",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "red" | "green" | "blue" | "yellow";
}) {
  const colorMap = {
    red: "text-brand-red bg-red-950/40 border-red-900/30",
    green: "text-brand-green bg-green-950/40 border-green-900/30",
    blue: "text-blue-400 bg-blue-950/40 border-blue-900/30",
    yellow: "text-yellow-400 bg-yellow-950/40 border-yellow-900/30",
  };
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border mb-3 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-brand-muted text-xs font-medium mb-1">{label}</p>
      <p className="text-white font-black text-2xl">{value}</p>
      {sub && <p className="text-brand-muted text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<PartnerStatus | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [payout, setPayout] = useState<PayoutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "payout">("overview");

  // Payout form state
  const [payoutMethod, setPayoutMethod] = useState<"usdt" | "bank">("usdt");
  const [payoutForm, setPayoutForm] = useState({
    usdt_address: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    bank_swift: "",
    bank_country: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchPartnerStatus();
      setStatus(s);
      if (!s.isPartner) {
        setLoading(false);
        return;
      }
      // Load stats and payout settings in parallel
      setStatsLoading(true);
      const [st, ps] = await Promise.all([
        fetchPartnerStats().catch(() => null),
        fetchPartnerPayoutSettings().catch(() => null),
      ]);
      setStats(st);
      if (ps) {
        setPayout(ps);
        setPayoutMethod(ps.method as "usdt" | "bank");
        setPayoutForm({
          usdt_address: ps.usdt_address || "",
          bank_name: ps.bank_name || "",
          bank_account_number: ps.bank_account_number || "",
          bank_account_name: ps.bank_account_name || "",
          bank_swift: ps.bank_swift || "",
          bank_country: ps.bank_country || "",
        });
      }
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : null;
      if (status === 401) {
        router.push("/auth/login?redirect=/partner-dashboard");
      }
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const copyLink = () => {
    if (!status?.referralLink) return;
    navigator.clipboard.writeText(status.referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePayout = async () => {
    setSavingPayout(true);
    try {
      const body =
        payoutMethod === "usdt"
          ? { method: "usdt", usdt_address: payoutForm.usdt_address }
          : {
              method: "bank",
              bank_name: payoutForm.bank_name,
              bank_account_number: payoutForm.bank_account_number,
              bank_account_name: payoutForm.bank_account_name,
              bank_swift: payoutForm.bank_swift,
              bank_country: payoutForm.bank_country,
            };
      const saved = await savePartnerPayoutSettings(body);
      setPayout(saved);
      toast.success("Payout settings saved!");
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      toast.error(detail || "Failed to save payout settings.");
    } finally {
      setSavingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  // Not an approved partner
  if (status && !status.isPartner) {
    return (
      <div className="min-h-screen bg-brand-dark">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-brand-card border border-brand-border rounded-xl p-10">
            <ShieldCheck className="w-12 h-12 text-brand-muted mx-auto mb-5" />
            <h1 className="text-white font-black text-2xl mb-3">Partner Access Required</h1>
            <p className="text-brand-muted text-sm leading-relaxed mb-8 max-w-md mx-auto">
              This dashboard is for approved Sure Odds partners. Apply to join our affiliate program
              and earn 30% commission on every sale you drive.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/partner"
                className="bg-brand-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
              >
                Apply to Partner Program
              </Link>
              <Link
                href="/dashboard"
                className="border border-brand-border text-brand-muted hover:text-white hover:border-gray-500 font-bold px-6 py-3 rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-brand-red mx-auto mb-3" />
          <p className="text-white font-bold mb-2">Something went wrong</p>
          <button onClick={() => router.push("/auth/login?redirect=/partner-dashboard")} className="text-brand-red text-sm underline">
            Log in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-green bg-green-950/40 border border-green-900/30 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Approved Partner
              </span>
            </div>
            <h1 className="text-white font-black text-2xl">
              Welcome back, {status.name?.split(" ")[0] ?? "Partner"}
            </h1>
            <p className="text-brand-muted text-sm mt-0.5">
              Earn 30% commission · Paid every 72 hours
            </p>
          </div>
          <button
            onClick={loadStatus}
            disabled={statsLoading}
            className="self-start sm:self-auto flex items-center gap-2 border border-brand-border text-brand-muted hover:text-white hover:border-gray-500 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Referral link card */}
        <div className="bg-gradient-to-r from-red-950/30 to-brand-card border border-brand-red/30 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <Link2 className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm mb-1">Your Partner Link</p>
              <p className="text-brand-muted text-xs mb-3">
                Share this link everywhere — anyone who signs up through it becomes your referral.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-brand-dark border border-brand-border rounded-lg px-3 py-2 font-mono text-xs text-brand-muted truncate">
                  {status.referralLink}
                </div>
                <button
                  onClick={copyLink}
                  className="shrink-0 flex items-center gap-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <a
                  href={status.referralLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 border border-brand-border text-brand-muted hover:text-white text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-brand-border/50">
            <span className="text-brand-muted text-xs">Referral code:</span>
            <code className="text-white font-mono text-xs font-bold">{status.referralCode}</code>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-border mb-6">
          {(["overview", "referrals", "payout"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-bold capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-white border-brand-red"
                  : "text-brand-muted border-transparent hover:text-white"
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "referrals" && `Referrals (${stats?.totalSignups ?? 0})`}
              {tab === "payout" && "Payout Settings"}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-brand-card border border-brand-border rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={MousePointerClick}
                  label="Link Clicks"
                  value={stats?.totalClicks ?? 0}
                  sub="Unique daily visits"
                  color="blue"
                />
                <StatCard
                  icon={Users}
                  label="Signups"
                  value={stats?.totalSignups ?? 0}
                  sub={`${stats?.conversionRate ?? 0}% conversion`}
                  color="yellow"
                />
                <StatCard
                  icon={DollarSign}
                  label="Total Sales"
                  value={`$${(stats?.totalSales ?? 0).toFixed(2)}`}
                  sub="Revenue driven"
                  color="green"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Commission"
                  value={`$${(stats?.totalCommission ?? 0).toFixed(2)}`}
                  sub="30% of all sales"
                  color="red"
                />
              </div>
            )}

            {/* Earnings breakdown */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-brand-card border border-brand-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <p className="text-white font-bold text-sm">Pending Payout</p>
                </div>
                <p className="text-yellow-400 font-black text-3xl">
                  ${(stats?.pendingCommission ?? 0).toFixed(2)}
                </p>
                <p className="text-brand-muted text-xs mt-1">
                  Paid automatically every 72 hours
                </p>
                {!payout && (
                  <button
                    onClick={() => setActiveTab("payout")}
                    className="mt-3 text-xs text-brand-red hover:text-red-400 font-bold transition-colors"
                  >
                    ⚠ Set payout method to receive funds →
                  </button>
                )}
              </div>

              <div className="bg-brand-card border border-brand-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-brand-green" />
                  <p className="text-white font-bold text-sm">Total Paid Out</p>
                </div>
                <p className="text-brand-green font-black text-3xl">
                  ${(stats?.paidCommission ?? 0).toFixed(2)}
                </p>
                <p className="text-brand-muted text-xs mt-1">
                  Lifetime paid commissions
                </p>
                {payout && (
                  <p className="text-xs text-brand-muted mt-2">
                    via {payout.method === "usdt" ? "USDT TRC-20" : "Bank Transfer"}
                  </p>
                )}
              </div>
            </div>

            {/* Conversion funnel */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-brand-muted" />
                <p className="text-white font-bold text-sm">Conversion Funnel</p>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-brand-muted">Clicks</span>
                    <span className="text-white font-bold">{stats?.totalClicks ?? 0}</span>
                  </div>
                  <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-brand-muted">Signups</span>
                    <span className="text-white font-bold">{stats?.totalSignups ?? 0}</span>
                  </div>
                  <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{
                        width:
                          stats?.totalClicks
                            ? `${Math.min(100, (stats.totalSignups / stats.totalClicks) * 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-brand-muted">Paid customers</span>
                    <span className="text-white font-bold">
                      {stats?.referrals.filter((r) => r.hasPurchased).length ?? 0}
                    </span>
                  </div>
                  <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-green rounded-full"
                      style={{
                        width:
                          stats?.totalSignups
                            ? `${Math.min(100, ((stats.referrals.filter((r) => r.hasPurchased).length) / stats.totalSignups) * 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Referrals Tab ────────────────────────────────────────────────── */}
        {activeTab === "referrals" && (
          <div>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-brand-card border border-brand-border rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !stats || stats.referrals.length === 0 ? (
              <div className="bg-brand-card border border-brand-border rounded-xl p-12 text-center">
                <Users className="w-10 h-10 text-brand-border mx-auto mb-3" />
                <p className="text-white font-bold mb-1">No referrals yet</p>
                <p className="text-brand-muted text-sm">
                  Share your partner link and start earning 30% commission on every sale.
                </p>
              </div>
            ) : (
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="text-left px-5 py-3 text-brand-muted text-xs font-bold uppercase">User</th>
                        <th className="text-left px-5 py-3 text-brand-muted text-xs font-bold uppercase">Joined</th>
                        <th className="text-left px-5 py-3 text-brand-muted text-xs font-bold uppercase">Status</th>
                        <th className="text-right px-5 py-3 text-brand-muted text-xs font-bold uppercase">Spent</th>
                        <th className="text-right px-5 py-3 text-brand-muted text-xs font-bold uppercase">Your Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.referrals.map((ref, i) => (
                        <tr key={i} className="border-b border-brand-border/50 hover:bg-brand-dark/30 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-white text-sm font-medium">
                              {ref.email.split("@")[0]}***@{ref.email.split("@")[1]}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-brand-muted text-sm">
                            {new Date(ref.joinedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4">
                            {ref.hasPurchased ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-green bg-green-950/40 border border-green-900/30 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Purchased
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-muted bg-brand-dark border border-brand-border px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                Free user
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-white font-mono">
                            ${ref.totalSpent.toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`font-mono text-sm font-bold ${ref.commissionEarned > 0 ? "text-brand-green" : "text-brand-muted"}`}>
                              ${ref.commissionEarned.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-brand-dark/50">
                        <td colSpan={3} className="px-5 py-3 text-brand-muted text-xs font-bold uppercase">
                          Totals
                        </td>
                        <td className="px-5 py-3 text-right text-white font-bold font-mono">
                          ${stats.totalSales.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right text-brand-green font-bold font-mono">
                          ${stats.totalCommission.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Payout Settings Tab ──────────────────────────────────────────── */}
        {activeTab === "payout" && (
          <div className="max-w-xl">
            <div className="bg-brand-card border border-brand-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-brand-red" />
                <h2 className="text-white font-bold text-base">Payout Method</h2>
              </div>
              <p className="text-brand-muted text-sm mb-6">
                Commissions are paid automatically every 72 hours once a payout method is set.
                Minimum payout: <strong className="text-white">$10</strong>.
              </p>

              {/* Method selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPayoutMethod("usdt")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    payoutMethod === "usdt"
                      ? "border-brand-red bg-red-950/20 text-white"
                      : "border-brand-border text-brand-muted hover:border-gray-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-green-950/50 border border-green-900/30 flex items-center justify-center">
                    <span className="text-brand-green font-black text-xs">₮</span>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">USDT</p>
                    <p className="text-xs text-brand-muted">TRC-20 Network</p>
                  </div>
                </button>
                <button
                  onClick={() => setPayoutMethod("bank")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    payoutMethod === "bank"
                      ? "border-brand-red bg-red-950/20 text-white"
                      : "border-brand-border text-brand-muted hover:border-gray-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-950/50 border border-blue-900/30 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Bank Transfer</p>
                    <p className="text-xs text-brand-muted">SWIFT / IBAN</p>
                  </div>
                </button>
              </div>

              {/* USDT form */}
              {payoutMethod === "usdt" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-brand-muted text-xs font-bold mb-1.5 uppercase tracking-wide">
                      USDT Wallet Address (TRC-20)
                    </label>
                    <input
                      type="text"
                      value={payoutForm.usdt_address}
                      onChange={(e) => setPayoutForm({ ...payoutForm, usdt_address: e.target.value })}
                      placeholder="T..."
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-red font-mono text-sm"
                    />
                    <p className="text-brand-muted text-xs mt-1">
                      ⚠ Double-check this address — payments are irreversible.
                    </p>
                  </div>
                </div>
              )}

              {/* Bank form */}
              {payoutMethod === "bank" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-brand-muted text-xs font-bold mb-1.5 uppercase tracking-wide">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_name}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                      placeholder="e.g. Barclays, Revolut, HSBC"
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-red text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-muted text-xs font-bold mb-1.5 uppercase tracking-wide">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_account_name}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bank_account_name: e.target.value })}
                      placeholder="Full name as on account"
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-red text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-muted text-xs font-bold mb-1.5 uppercase tracking-wide">
                      IBAN / Account Number
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_account_number}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bank_account_number: e.target.value })}
                      placeholder="IBAN or local account number"
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-red font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-brand-muted text-xs font-bold mb-1.5 uppercase tracking-wide">
                        SWIFT / BIC
                      </label>
                      <input
                        type="text"
                        value={payoutForm.bank_swift}
                        onChange={(e) => setPayoutForm({ ...payoutForm, bank_swift: e.target.value })}
                        placeholder="e.g. BARCGB22"
                        className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-red font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-brand-muted text-xs font-bold mb-1.5 uppercase tracking-wide">
                        Country
                      </label>
                      <input
                        type="text"
                        value={payoutForm.bank_country}
                        onChange={(e) => setPayoutForm({ ...payoutForm, bank_country: e.target.value })}
                        placeholder="e.g. United Kingdom"
                        className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-red text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSavePayout}
                disabled={savingPayout}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {savingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Payout Settings"
                )}
              </button>

              {payout && (
                <div className="mt-4 p-3 bg-green-950/20 border border-green-900/30 rounded-lg">
                  <p className="text-brand-green text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Payout method set — you&apos;ll receive commissions automatically every 72h
                  </p>
                </div>
              )}
            </div>

            {/* Payout schedule info */}
            <div className="mt-4 bg-brand-card border border-brand-border rounded-xl p-5">
              <p className="text-white font-bold text-sm mb-3">Payout Schedule</p>
              <ul className="space-y-2 text-brand-muted text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  Commissions are earned when your referrals purchase pick packages
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  Automatic payout every 72 hours for balances above $10
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  USDT (TRC-20) payouts arrive within minutes
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  Bank transfer payouts arrive within 2–3 business days
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
