"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import ProfileDrawer from "@/components/profile/ProfileDrawer";
import { useProfile } from "@/lib/hooks/useProfile";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, user, isLoading, updateProfile, signOut } = useProfile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const handleOpenDrawer = () => setIsDrawerOpen(true);
  const handleCloseDrawer = () => setIsDrawerOpen(false);
  const handleSaveProfile = (fullName: string) =>
    updateProfile({ full_name: fullName });

  return (
    <div className="min-h-screen text-text-primary">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-bg-card/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-4 md:px-6">
          <Link href="/">
            <Image src="/images/logo/logo.svg" alt="Ezy Notez" width={100} height={60} />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-sm font-semibold text-text-primary">
                {isLoading ? "Loading..." : displayName}
              </span>
              <span className="text-xs text-text-muted">
                {isLoading ? "" : displayEmail || "Not signed in"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-fade-border bg-bg-card text-xs font-semibold text-text-primary transition hover:border-blue-accent/50"
              aria-label="Open profile"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials || "U"
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full">{children}</main>

      <ProfileDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        user={
          profile
            ? {
                id: profile.id,
                full_name: profile.full_name,
                email: profile.email,
                avatar_url: profile.avatar_url,
              }
            : null
        }
        onSave={handleSaveProfile}
        onSignOut={signOut}
      />
    </div>
  );
}
