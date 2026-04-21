"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWorkspaceDetail = pathname.startsWith("/workspaces/") && pathname.length > "/workspaces/".length;
  
  const { profile, user } = useProfile();
  const displayName = profile?.full_name || "Student";
  const displayEmail = profile?.email || user?.email || "";
  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }, [displayName]);

  return (
    <div className="min-h-screen text-text-primary">
      {!isWorkspaceDetail && (
        <header className="sticky top-0 z-20 border-b border-white/8 bg-white/4 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25)] h-14 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            <Link href="/">
              <Image src="/images/logo/logo.svg" alt="Ezy Notez" width={125} height={40} className="h-10 w-auto" />
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-accent flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-white">
                  {initials || "U"}
                </span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden max-w-30">
              <span className="text-sm font-medium text-text-primary truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[11px] text-white/50 truncate leading-tight">
                {displayEmail}
              </span>
            </div>
          </div>
        </header>
      )}

      <main className="w-full">{children}</main>
    </div>
  );
}
