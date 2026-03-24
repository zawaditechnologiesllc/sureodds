"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, TrendingUp, LogIn, Zap, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user?: { email: string; accuracy: number } | null;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Link href="/predictions" className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              Predictions
            </Link>
            <Link href="/results" className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              Results
            </Link>
            <Link href="/packages" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors font-medium">
              <CreditCard className="w-3.5 h-3.5" />
              Buy Credits
            </Link>
            <Link href="/partner" className="text-sm text-gray-300 hover:text-white transition-colors font-medium">
              Earn 30%
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-brand-card border border-brand-border rounded px-3 py-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-brand-green font-bold text-sm">{user.accuracy}%</span>
                  <span className="text-brand-muted text-xs">Accuracy</span>
                </div>
                <button onClick={onLogout} className="text-sm text-brand-muted hover:text-white transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="hidden md:flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link href="/auth/signup" className="bg-brand-red hover:bg-red-700 text-white text-sm font-bold px-4 py-1.5 rounded transition-colors">
                  Get Started
                </Link>
              </>
            )}

            <button className="md:hidden text-gray-300" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-brand-darker border-t border-brand-border">
          <div className="px-4 py-3 flex flex-col gap-1">
            {[
              { href: "/predictions", label: "Predictions" },
              { href: "/results", label: "Results" },
              { href: "/packages", label: "Buy Credits" },
              { href: "/partner", label: "Earn 30% Commission" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn("text-sm text-gray-300 hover:text-white py-2.5 border-b border-brand-border last:border-0")}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            {!user && (
              <Link href="/auth/login" className="text-sm text-gray-300 hover:text-white py-2.5" onClick={() => setMobileOpen(false)}>
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
