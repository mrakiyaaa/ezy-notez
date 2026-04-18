"use client";

import { useEffect, useState } from "react";

type Preferences = {
  emailUpdates: boolean;
  studyReminders: boolean;
  soundEffects: boolean;
};

const STORAGE_KEY = "ezynotes:preferences";

const defaults: Preferences = {
  emailUpdates: true,
  studyReminders: true,
  soundEffects: false,
};

export default function SettingsPreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs({ ...defaults, ...parsed });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, hydrated]);

  const toggle = (key: keyof Preferences) =>
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const rows: {
    key: keyof Preferences;
    label: string;
    hint: string;
  }[] = [
    {
      key: "emailUpdates",
      label: "Email updates",
      hint: "Receive product news and tips by email.",
    },
    {
      key: "studyReminders",
      label: "Study reminders",
      hint: "Periodic nudges to review flashcards and quizzes.",
    },
    {
      key: "soundEffects",
      label: "Sound effects",
      hint: "Play subtle sounds for quiz actions.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-text-primary text-2xl font-bold">Preferences</h1>
        <p className="text-text-muted text-sm mt-1">
          Customize how Ezy Notez behaves for you. Saved locally on this device.
        </p>
      </div>

      <div className="bg-bg-card border border-fade-border rounded-xl divide-y divide-fade-border">
        {rows.map(({ key, label, hint }) => {
          const value = prefs[key];
          return (
            <div
              key={key}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  {label}
                </div>
                <div className="text-xs text-text-muted mt-0.5">{hint}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-label={`Toggle ${label}`}
                onClick={() => toggle(key)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  value ? "bg-blue-accent" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    value ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
