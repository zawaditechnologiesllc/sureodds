"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, CheckCircle, LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

export default function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const tabs = isAuthenticated
    ? [
        { href: "/predictions", label: "Predictions", icon: BarChart2 },
        { href: "/results", label: "Results", icon: CheckCircle },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ]
    : [
        { href: "/predictions", label: "Predictions", icon: BarChart2 },
        { href: "/results", label: "Results", icon: CheckCircle },
        { href: "/auth/login", label: "Account", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-darker border-t border-brand-border md:hidden">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors",
                active ? "text-brand-red" : "text-brand-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
