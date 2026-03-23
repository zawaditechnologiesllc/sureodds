"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { RefreshCw, Users, BarChart2, DollarSign, Play, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { triggerUpdateFixtures, triggerRunPredictions, triggerUpdateResults } from "@/lib/api";

const MOCK_USERS = [
  { id: "u1", email: "user1@example.com", isPaid: true, createdAt: "2025-01-10" },
  { id: "u2", email: "user2@example.com", isPaid: false, createdAt: "2025-01-12" },
  { id: "u3", email: "user3@example.com", isPaid: true, createdAt: "2025-01-15" },
];

const OVERVIEW_STATS = [
  { label: "Total Users", value: "4,823", icon: Users, color: "text-white" },
  { label: "Paid Users", value: "1,240", icon: DollarSign, color: "text-brand-green" },
  { label: "Today Predictions", value: "42", icon: BarChart2, color: "text-brand-yellow" },
  { label: "Monthly Revenue", value: "$6,200", icon: DollarSign, color: "text-brand-green" },
];

type ActionStatus = "idle" | "loading" | "success" | "error";

export default function AdminPage() {
  const [fixturesStatus, setFixturesStatus] = useState<ActionStatus>("idle");
  const [predictionsStatus, setPredictionsStatus] = useState<ActionStatus>("idle");
  const [resultsStatus, setResultsStatus] = useState<ActionStatus>("idle");

  const runAction = async (
    action: () => Promise<unknown>,
    setStatus: (s: ActionStatus) => void,
    label: string
  ) => {
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

  const StatusIcon = ({ status }: { status: ActionStatus }) => {
    if (status === "loading") return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status === "success") return <CheckCircle className="w-4 h-4 text-brand-green" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-brand-red" />;
    return <Play className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-white font-black text-2xl mb-6">Admin Panel</h1>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {OVERVIEW_STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-brand-card border border-brand-border rounded-xl p-4">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-brand-muted text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">Automation Controls</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                label: "Update Fixtures",
                desc: "Fetch latest fixtures from API-Football",
                status: fixturesStatus,
                action: () =>
                  runAction(triggerUpdateFixtures, setFixturesStatus, "Update Fixtures"),
              },
              {
                label: "Run Predictions",
                desc: "Generate predictions for upcoming matches",
                status: predictionsStatus,
                action: () =>
                  runAction(triggerRunPredictions, setPredictionsStatus, "Run Predictions"),
              },
              {
                label: "Update Results",
                desc: "Fetch and record match results",
                status: resultsStatus,
                action: () =>
                  runAction(triggerUpdateResults, setResultsStatus, "Update Results"),
              },
            ].map(({ label, desc, status, action }) => (
              <div
                key={label}
                className="bg-brand-dark border border-brand-border rounded-lg p-4"
              >
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

        {/* Users Table */}
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-border">
            <h2 className="text-white font-bold text-lg">Recent Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs text-brand-muted font-medium px-5 py-3">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {MOCK_USERS.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-sm text-white">{user.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          user.isPaid
                            ? "bg-green-950 text-brand-green border border-green-900"
                            : "bg-brand-dark text-brand-muted border border-brand-border"
                        }`}
                      >
                        {user.isPaid ? "PAID" : "FREE"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-brand-muted">{user.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
