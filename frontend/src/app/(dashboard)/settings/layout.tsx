"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Briefcase,
  SlidersHorizontal,
  CreditCard,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

type SettingsNavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: SettingsNavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/workspace", label: "Workspace settings", icon: Briefcase },
  { href: "/settings/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/settings/subscription", label: "Subscription", icon: CreditCard },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useProfile();

  const handleBack = useCallback(() => {
    let target = "/workspaces";
    try {
      const slug = localStorage.getItem("ezynotes:last-workspace-slug");
      if (slug) target = `/workspaces/${slug}`;
    } catch {
      /* */
    }
    router.push(target);
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-93px)] bg-main overflow-hidden">
      {/* Left sub-nav */}
      <aside className="w-64 flex flex-col border-r border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)] h-full shrink-0">
        <div className="px-4 mt-6 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1"
            aria-label="Back to workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="text-[10px] uppercase font-semibold text-text-muted mt-5 mb-2 px-2">
            Settings
          </div>
        </div>

        <nav className="px-4 flex-1 overflow-y-auto flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-accent/10 text-text-secondary"
                    : "text-text-muted hover:bg-white/4 hover:text-text-primary"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-nav-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4.5 bg-blue-accent rounded-r shadow-[0_0_12px_rgba(59,130,246,0.7)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-3.75 h-3.75 ${isActive ? "opacity-100" : "opacity-60"}`}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-fade-border shrink-0">
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.75 h-3.75 opacity-70" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
