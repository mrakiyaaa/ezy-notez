"use client";

import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";

export default function SettingsProfilePage() {
  const { profile, user, isLoading, updateProfile } = useProfile();

  const [fullName, setFullName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const name = profile?.full_name ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(name);
    setSavedName(name);
  }, [profile?.id, profile?.full_name]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 2200);
    return () => clearTimeout(t);
  }, [successMessage]);

  const email = profile?.email || user?.email || "";
  const initials = useMemo(() => {
    return (fullName || "User")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }, [fullName]);

  const trimmed = fullName.trim();
  const isDirty = trimmed !== savedName.trim();
  const isInvalid = !trimmed;
  const isDisabled = isSaving || !isDirty || isInvalid;

  const handleSave = async () => {
    if (isDisabled) return;
    setIsSaving(true);
    const updated = await updateProfile({ full_name: trimmed });
    setIsSaving(false);
    if (updated) {
      setSavedName(updated.full_name);
      setSuccessMessage("Profile updated");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-text-primary text-2xl font-bold">Profile</h1>
        <p className="text-text-muted text-sm mt-1">
          Manage your public account information.
        </p>
      </div>

      <div className="bg-bg-card border border-fade-border rounded-xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-accent flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={fullName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-white">
                {initials || "U"}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-text-primary text-base font-semibold truncate">
              {isLoading ? "Loading…" : fullName || "Unnamed user"}
            </span>
            <span className="text-text-muted text-sm truncate">{email}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wide text-text-muted">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-white/5 border border-fade-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wide text-text-muted">
            Email
          </label>
          <input
            value={email}
            readOnly
            className="w-full bg-white/5 border border-fade-border rounded-lg px-3 py-2 text-sm text-text-muted cursor-not-allowed"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-emerald-400">
            {successMessage || "\u00A0"}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isDisabled}
            className="bg-blue-accent text-white font-semibold text-sm rounded-lg px-5 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
