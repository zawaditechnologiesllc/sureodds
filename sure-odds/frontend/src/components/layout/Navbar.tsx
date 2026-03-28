"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogIn, Zap, LayoutDashboard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  const publicLinks = [
    { href: "/predictions", label: "Fixtures" },
    { href: "/results", label: "Results" },
    { href: "/bundles", label: "🔥 Bundles" },
    { href: "/pricing", label: "Pricing" },
  ];

  const mobilePublicLinks = [
    { href: "/predictions", label: "Fixtures" },
    { href: "/results", label: "Results" },
    { href: "/bundles", label: "🔥 Bundles" },
    { href: "/pricing", label: "Pricing" },
    { href: "/partner", label: "Earn 30% Commission" },
  ];

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
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
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
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand-muted hover:bg-brand-card hover:text-white transition-colors border-t border-brand-border"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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

            <button
              className="md:hidden text-gray-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
