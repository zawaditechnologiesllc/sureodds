"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, LogIn, Zap, LayoutDashboard, ChevronDown, CreditCard, Users, Bell, CheckCircle, AlertCircle, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { fetchMyNotifications } from "@/lib/api";

interface AppNotification {
  id: number;
  title: string;
  message: string;
  target: string;
  created_at: string | null;
}

const LAST_SEEN_KEY = "notif_last_seen";

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchMyNotifications();
      setNotifications(data);
      const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || "0", 10);
      const unread = data.filter((n: AppNotification) => {
        if (!n.created_at) return false;
        return new Date(n.created_at).getTime() > lastSeen;
      }).length;
      setUnreadCount(unread);
    } catch {
      // Silent
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenNotif = () => {
    setNotifOpen((prev) => !prev);
    if (!notifOpen) {
      localStorage.setItem(LAST_SEEN_KEY, Date.now().toString());
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  const publicLinks = [
    { href: "/predictions", label: "Fixtures" },
    { href: "/results", label: "Results" },
    { href: "/bundles", label: "🔥 Bundles" },
    { href: "/vip", label: "👑 VIP Access" },
    { href: "/pricing", label: "Pricing" },
  ];

  const mobilePublicLinks = [
    { href: "/predictions", label: "Fixtures" },
    { href: "/results", label: "Results" },
    { href: "/bundles", label: "🔥 Bundles" },
    { href: "/vip", label: "👑 VIP Access" },
    { href: "/pricing", label: "Pricing" },
    { href: "/partner", label: "Earn 30% Commission" },
  ];

  function formatNotifTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return (
    <header className="sticky top-0 z-50 bg-brand-darker border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-red rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-white font-black text-lg tracking-tight">
              SURE<span className="text-brand-red">ODDS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {publicLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleOpenNotif}
                    className="relative p-2 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-brand-darker border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
                        <p className="text-white text-sm font-bold">Notifications</p>
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="text-brand-muted hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-8 h-8 text-brand-muted mx-auto mb-2 opacity-40" />
                            <p className="text-brand-muted text-sm">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className="px-4 py-3 border-b border-brand-border last:border-0 hover:bg-brand-card transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-brand-red/10 border border-red-900/40 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                  <Zap className="w-3 h-3 text-brand-red" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-bold leading-tight">{n.title}</p>
                                  <p className="text-brand-muted text-xs mt-0.5 leading-relaxed">{n.message}</p>
                                  {n.created_at && (
                                    <p className="text-brand-muted text-[10px] mt-1 opacity-60">{formatNotifTime(n.created_at)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-brand-border">
                          <p className="text-brand-muted text-[10px] text-center">
                            {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Menu — desktop */}
                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-3 py-1.5 hover:border-gray-500 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-brand-green" />
                    <span className="text-white text-sm font-medium truncate max-w-[120px]">
                      {user.email?.split("@")[0]}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-brand-muted transition-transform", userMenuOpen && "rotate-180")} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-brand-darker border border-brand-border rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-2.5 border-b border-brand-border">
                        <p className="text-brand-muted text-xs">Signed in as</p>
                        <p className="text-white text-xs font-bold truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-brand-card hover:text-white transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/predictions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-brand-card hover:text-white transition-colors"
                      >
                        <Zap className="w-4 h-4" />
                        Today&apos;s Picks
                      </Link>
                      <Link
                        href="/vip"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-400 hover:bg-brand-card hover:text-yellow-300 transition-colors border-t border-brand-border/50"
                      >
                        <Crown className="w-4 h-4" />
                        VIP Access
                      </Link>
                      <Link
                        href="/packages"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-brand-card hover:text-white transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Add Credits
                      </Link>
                      <Link
                        href="/partner-dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-brand-card hover:text-white transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Partner Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand-muted hover:bg-brand-card hover:text-white transition-colors border-t border-brand-border"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden md:flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-brand-red hover:bg-red-700 text-white text-sm font-bold px-4 py-1.5 rounded transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}

            {!isAuthenticated && (
              <button
                className="md:hidden text-gray-300"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-brand-darker border-t border-brand-border">
          <div className="px-4 py-3 flex flex-col gap-1">
            {mobilePublicLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn("text-sm text-gray-300 hover:text-white py-2.5 border-b border-brand-border last:border-0")}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-brand-green hover:text-white py-2.5 border-b border-brand-border font-bold"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/partner-dashboard"
                  className="text-sm text-gray-300 hover:text-white py-2.5 border-b border-brand-border"
                  onClick={() => setMobileOpen(false)}
                >
                  Partner Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-sm text-brand-muted hover:text-white py-2.5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm text-gray-300 hover:text-white py-2.5"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
