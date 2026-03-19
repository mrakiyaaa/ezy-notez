"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Profile } from "@/types/user";

type ProfileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  user: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
  onSave?: (fullName: string) => Promise<Profile | null>;
  onSignOut?: () => void;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
};

export default function ProfileDrawer({
  isOpen,
  onClose,
  user,
  onSave,
  onSignOut,
}: ProfileDrawerProps) {
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [savedName, setSavedName] = useState(user?.full_name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const name = user?.full_name ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(name);
    setSavedName(name);
  }, [user?.id, user?.full_name]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => setSuccessMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const isDirty = fullName.trim() !== savedName.trim();
  const isInvalid = !fullName.trim();
  const isDisabled = isSaving || !isDirty || isInvalid;

  const initials = useMemo(() => getInitials(fullName || "User"), [fullName]);

  const handleSave = async () => {
    if (!onSave || isDisabled) return;

    setIsSaving(true);
    const updated = await onSave(fullName.trim());
    setIsSaving(false);

    if (updated) {
      setSavedName(updated.full_name);
      setSuccessMessage("Profile updated");
      setTimeout(() => onClose(), 600);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-80 border-l border-white/10 shadow-2xl transition-transform duration-300 sm:w-96 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "var(--main)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Profile settings"
      >
        <div className="flex h-full flex-col p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Profile
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Account settings
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-1.5 text-white/70 hover:border-white/30 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={fullName || "User"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials || "U"
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {fullName || "Your name"}
              </p>
              <p className="text-xs text-white/50">Manage your public info</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <label className="block text-xs uppercase tracking-widest text-white/50">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-white/40"
                placeholder="Your full name"
              />
            </label>

            <label className="block text-xs uppercase tracking-widest text-white/50">
              Email
              <input
                value={user?.email ?? ""}
                readOnly
                className="mt-2 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"
              />
            </label>
          </div>

          <div className="mt-auto space-y-3">
            {successMessage ? (
              <p className="text-xs text-emerald-300">{successMessage}</p>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={isDisabled}
              className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
