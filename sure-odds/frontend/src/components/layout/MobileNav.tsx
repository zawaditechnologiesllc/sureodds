"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, CheckCircle, LayoutDashboard, User, Flame, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

export default function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const tabs = isAuthenticated
    ? [
        { href: "/predictions", label: "Fixtures", icon: BarChart2 },
        { href: "/results", label: "Results", icon: CheckCircle },
        { href: "/bundles", label: "Bundles", icon: Flame },
        { href: "/vip", label: "VIP", icon: Crown },
        { href: "/dashboard", label: "Account", icon: LayoutDashboard },
      ]
    : [
        { href: "/predictions", label: "Fixtures", icon: BarChart2 },
        { href: "/results", label: "Results", icon: CheckCircle },
        { href: "/bundles", label: "Bundles", icon: Flame },
        { href: "/vip", label: "VIP", icon: Crown },
        { href: "/auth/login", label: "Account", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-darker border-t border-brand-border md:hidden">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const isVip = href === "/vip";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors",
                active
                  ? isVip ? "text-yellow-400" : "text-brand-red"
                  : isVip ? "text-yellow-600" : "text-brand-muted"
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
