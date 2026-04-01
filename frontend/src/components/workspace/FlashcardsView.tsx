"use client";

import { useState, useEffect } from "react";
import { WalletCards, Plus, Sparkles, X } from "lucide-react";
import type { AuraProps, FlashcardSet } from "./flashcards/constants";
import { MOCK_FLASHCARD_SETS } from "./flashcards/constants";
import FlashcardGenerationPanel from "./flashcards/FlashcardGenerationPanel";
import FlashcardSetGrid from "./flashcards/FlashcardSetGrid";
import StudyMode from "./flashcards/StudyMode";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FlashcardsViewProps extends AuraProps {
  workspaceId: string;
}

interface Notification {
  message: string;
  success: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlashcardsView({
  workspaceId,
  auraHex,
  auraRgb,
  auraContrast,
}: FlashcardsViewProps) {
  const auraProps = { auraHex, auraRgb, auraContrast };

  const [sets, setSets] = useState<FlashcardSet[]>(MOCK_FLASHCARD_SETS);
  const [studyingSet, setStudyingSet] = useState<FlashcardSet | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Auto-dismiss notification after 3.5 s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleGenerate = async (resourceIds: string[], topic: string) => {
    setIsGenerating(true);
    setShowPanel(false);
    setNotification({ message: "Generating flashcards…", success: false });

    // Simulated generation delay — replace with real API call
    await new Promise((r) => setTimeout(r, 2200));

    const ts = Date.now();
    const newSet: FlashcardSet = {
      id: `set-${ts}`,
      title: topic.trim() ? `${topic.trim()} Flashcards` : "New Flashcard Set",
      resourceId: resourceIds[0] ?? "",
      resourceName: "Selected Resource",
      cards: [
        {
          id: `nc1-${ts}`,
          front: "What is the central concept introduced in this material?",
          back: "The core principles and foundational theory presented in the selected resource.",
        },
        {
          id: `nc2-${ts}`,
          front: "Define the key terminology used throughout.",
          back: "Specialised vocabulary and domain-specific terms that underpin the subject matter.",
        },
        {
          id: `nc3-${ts}`,
          front: "What are the primary practical applications?",
          back: "Real-world use cases and applied examples demonstrated within the resource content.",
        },
      ],
      createdAt: new Date().toISOString(),
      knownIds: [],
    };

    setSets((prev) => [newSet, ...prev]);
    setIsGenerating(false);
    setNotification({ message: "Flashcard set generated!", success: true });
  };

  const handleDelete = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStudyComplete = (knownIds: string[], _reviewIds: string[]) => {
    if (!studyingSet) return;
    setSets((prev) =>
      prev.map((s) =>
        s.id === studyingSet.id ? { ...s, knownIds } : s
      )
    );
  };

  // ---------------------------------------------------------------------------
  // Study mode — fills the entire content area
  // ---------------------------------------------------------------------------

  if (studyingSet) {
    return (
      <div className="flex flex-col h-full">
        <StudyMode
          set={studyingSet}
          onExit={() => setStudyingSet(null)}
          onComplete={handleStudyComplete}
          {...auraProps}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // List view
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* ── Notification banner ── */}
      {notification && (
        <div
          className="flex items-center justify-between px-5 py-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            backgroundColor: notification.success
              ? `rgba(${auraRgb}, 0.1)`
              : "rgba(255,255,255,0.03)",
            borderBottom: `1px solid rgba(${auraRgb}, 0.12)`,
            color: notification.success
              ? auraHex
              : "var(--color-text-secondary)",
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `rgba(${auraRgb}, 0.15)` }}
            >
              <WalletCards className="w-5 h-5" style={{ color: auraHex }} />
            </div>
            <div>
              <h2 className="text-text-primary text-lg font-semibold">
                Flashcards
              </h2>
              <p className="text-text-muted text-sm">
                AI-generated study cards from your resources
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowPanel((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: showPanel
                ? auraHex
                : `rgba(${auraRgb}, 0.1)`,
              color: showPanel ? auraContrast : auraHex,
              border: `1px solid rgba(${auraRgb}, 0.25)`,
            }}
            onMouseEnter={(e) => {
              if (!showPanel)
                e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.2)`;
            }}
            onMouseLeave={(e) => {
              if (!showPanel)
                e.currentTarget.style.backgroundColor = `rgba(${auraRgb}, 0.1)`;
            }}
          >
            <Plus className="w-4 h-4" />
            Generate
          </button>
        </div>

        {/* Generation panel (slide-in) */}
        {showPanel && (
          <FlashcardGenerationPanel
            workspaceId={workspaceId}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onClose={() => setShowPanel(false)}
            {...auraProps}
          />
        )}

        {/* Body */}
        {isGenerating ? (
          <GenerationShimmer auraRgb={auraRgb} />
        ) : sets.length === 0 ? (
          <EmptyState
            onGenerate={() => setShowPanel(true)}
            auraHex={auraHex}
            auraRgb={auraRgb}
          />
        ) : (
          <FlashcardSetGrid
            sets={sets}
            onStudy={setStudyingSet}
            onDelete={handleDelete}
            {...auraProps}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generation shimmer skeleton
// ---------------------------------------------------------------------------

function GenerationShimmer({ auraRgb }: { auraRgb: string }) {
  return (
    <>
      <style>{`
        @keyframes fc-shimmer-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .fc-shimmer { animation: fc-shimmer-sweep 1.8s ease-in-out infinite; }
      `}</style>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-fade-border bg-bg-card p-5 flex flex-col gap-3.5"
            style={{ opacity: 1 - i * 0.18 }}
          >
            {/* Title line */}
            <div className="relative overflow-hidden rounded-md h-4 bg-white/5">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.22), transparent)`,
                }}
              />
            </div>
            {/* Sub line */}
            <div className="relative overflow-hidden rounded-md h-3 bg-white/5 w-2/3">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.16), transparent)`,
                  animationDelay: "0.15s",
                }}
              />
            </div>
            {/* Third line */}
            <div className="relative overflow-hidden rounded-md h-3 bg-white/5 w-1/2">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.12), transparent)`,
                  animationDelay: "0.3s",
                }}
              />
            </div>
            {/* Progress bar */}
            <div className="mt-1 relative overflow-hidden rounded-full h-1 bg-white/5">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.2), transparent)`,
                  animationDelay: "0.05s",
                }}
              />
            </div>
            {/* Button ghost */}
            <div className="relative overflow-hidden rounded-lg h-8 bg-white/5 mt-1">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(${auraRgb}, 0.14), transparent)`,
                  animationDelay: "0.1s",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  auraHex,
  auraRgb,
  onGenerate,
}: {
  auraHex: string;
  auraRgb: string;
  onGenerate: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 relative overflow-hidden min-h-[400px]">
      {/* Subtle dot-grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(${auraRgb}, 0.25) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.35,
        }}
      />

      {/* Radial glow behind icon */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${auraRgb}, 0.08) 0%, transparent 68%)`,
        }}
      />

      {/* Icon */}
      <div
        className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          backgroundColor: `rgba(${auraRgb}, 0.12)`,
          boxShadow: `0 0 48px rgba(${auraRgb}, 0.22)`,
          border: `1px solid rgba(${auraRgb}, 0.22)`,
        }}
      >
        <WalletCards className="w-10 h-10" style={{ color: auraHex }} />
      </div>

      {/* Copy */}
      <div className="relative z-10 text-center">
        <h2 className="text-text-primary text-xl font-bold mb-2">
          No Flashcard Sets Yet
        </h2>
        <p className="text-text-muted text-sm max-w-xs">
          Generate AI-powered flashcards from your workspace resources to start
          studying.
        </p>
      </div>

      {/* CTA button */}
      <button
        onClick={onGenerate}
        className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{
          backgroundColor: auraHex,
          color: "#ffffff",
          boxShadow: `0 0 28px rgba(${auraRgb}, 0.42)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 44px rgba(${auraRgb}, 0.64)`;
          e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 0 28px rgba(${auraRgb}, 0.42)`;
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Sparkles className="w-4 h-4" />
        Generate Your First Set
      </button>
    </div>
  );
}
