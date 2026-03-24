"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  RefreshCw,
  Users,
  BarChart2,
  DollarSign,
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
} from "lucide-react";
import toast from "react-hot-toast";
import { triggerUpdateFixtures, triggerRunPredictions, triggerUpdateResults } from "@/lib/api";

type AdminTab = "overview" | "partners" | "users";
type ActionStatus = "idle" | "loading" | "success" | "error";
type PartnerStatus = "pending" | "approved" | "rejected";

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

const OVERVIEW_STATS = [
  { label: "Total Users", value: "4,823", icon: Users, color: "text-white" },
  { label: "Paid Users", value: "1,240", icon: DollarSign, color: "text-brand-green" },
  { label: "Today Predictions", value: "42", icon: BarChart2, color: "text-brand-yellow" },
  { label: "Monthly Revenue", value: "$6,200", icon: DollarSign, color: "text-brand-green" },
];

const MOCK_USERS = [
  { id: "u1", email: "user1@example.com", isPaid: true, createdAt: "2025-01-10", referrals: 3 },
  { id: "u2", email: "user2@example.com", isPaid: false, createdAt: "2025-01-12", referrals: 0 },
  { id: "u3", email: "user3@example.com", isPaid: true, createdAt: "2025-01-15", referrals: 7 },
];

const MOCK_APPLICATIONS: PartnerApplication[] = [
  { id: "p1", name: "James Odhiambo", email: "james@example.com", platform: "instagram", handle: "jamesbets_ke", followers: "20,000 – 100,000", why: "I have a sports tips page with high engagement. My audience trusts my analysis.", submittedAt: "2026-03-23", status: "pending" },
  { id: "p2", name: "Sarah Wanjiru", email: "sarah@example.com", platform: "twitter", handle: "sarahsports", followers: "5,000 – 20,000", why: "I tweet daily football analysis and have a loyal following that asks for tipster recommendations.", submittedAt: "2026-03-22", status: "pending" },
  { id: "p3", name: "Tony Mwangi", email: "tony@example.com", platform: "youtube", handle: "TonyFootball", followers: "100,000 – 500,000", why: "YouTube channel on football betting analysis. My subscribers are actively looking for reliable prediction services.", submittedAt: "2026-03-21", status: "approved" },
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
  const [tab, setTab] = useState<AdminTab>("overview");
  const [applications, setApplications] = useState<PartnerApplication[]>(MOCK_APPLICATIONS);
  const [viewingApp, setViewingApp] = useState<PartnerApplication | null>(null);

  const [fixturesStatus, setFixturesStatus] = useState<ActionStatus>("idle");
  const [predictionsStatus, setPredictionsStatus] = useState<ActionStatus>("idle");
  const [resultsStatus, setResultsStatus] = useState<ActionStatus>("idle");

  const runAction = async (action: () => Promise<unknown>, setStatus: (s: ActionStatus) => void, label: string) => {
    setStatus("loading");
    try {
      await action();
      setStatus("success");
      toast.success(`${label} completed!`);
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

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-black text-2xl">Admin Panel</h1>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-brand-card border border-brand-border rounded-lg p-1 mb-8">
          {([
            { id: "overview", label: "Overview" },
            { id: "partners", label: `Partner Applications${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { id: "users", label: "Users" },
          ] as { id: AdminTab; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${tab === id ? "bg-brand-red text-white" : "text-brand-muted hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {OVERVIEW_STATS.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-brand-card border border-brand-border rounded-xl p-4">
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-brand-muted text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl p-5">
              <h2 className="text-white font-bold text-lg mb-4">Automation Controls</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { label: "Update Fixtures", desc: "Fetch latest fixtures from API-Football", status: fixturesStatus, action: () => runAction(triggerUpdateFixtures, setFixturesStatus, "Update Fixtures") },
                  { label: "Run Predictions", desc: "Generate predictions for upcoming matches", status: predictionsStatus, action: () => runAction(triggerRunPredictions, setPredictionsStatus, "Run Predictions") },
                  { label: "Update Results", desc: "Fetch and record match results", status: resultsStatus, action: () => runAction(triggerUpdateResults, setResultsStatus, "Update Results") },
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
                    <button
                      onClick={() => setViewingApp(null)}
                      className="flex-1 py-2.5 rounded-lg border border-brand-border text-brand-muted hover:text-white text-sm font-bold transition-colors"
                    >
                      Close
                    </button>
                    {viewingApp.status !== "rejected" && (
                      <button
                        onClick={() => updateAppStatus(viewingApp.id, "rejected")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-950 border border-red-900 text-brand-red hover:bg-red-900 text-sm font-bold transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    )}
                    {viewingApp.status !== "approved" && (
                      <button
                        onClick={() => updateAppStatus(viewingApp.id, "approved")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-950 border border-green-900 text-brand-green hover:bg-green-900 text-sm font-bold transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stats Row */}
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

            {/* Applications Table */}
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
                          <td className="px-5 py-3">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setViewingApp(app)}
                              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white border border-brand-border hover:border-gray-500 rounded px-3 py-1.5 transition-colors"
                            >
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
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="text-white font-bold text-lg">Recent Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Email</th>
                    <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Status</th>
                    <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Referrals</th>
                    <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {MOCK_USERS.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-sm text-white">{user.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${user.isPaid ? "bg-green-950 text-brand-green border-green-900" : "bg-brand-dark text-brand-muted border-brand-border"}`}>
                          {user.isPaid ? "PAID" : "FREE"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-brand-muted">{user.referrals}</td>
                      <td className="px-5 py-3 text-sm text-brand-muted">{user.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
