"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WalletCards, Plus, Search, Sparkles, X, SquareStack } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { FlashcardSet as LocalFlashcardSet, Flashcard as LocalFlashcard } from "./flashcards/constants";
import type { FlashcardSet, FlashcardSetWithCards } from "@/types/flashcard";
import {
  generateFlashcards,
  getWorkspaceFlashcardSets,
  getFlashcardSetById,
  deleteFlashcardSet,
} from "@/services/flashcard.service";
import FlashcardGenerationPanel from "./flashcards/FlashcardGenerationPanel";
import FlashcardSetGrid from "./flashcards/FlashcardSetGrid";
import StudyMode from "./flashcards/StudyMode";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FlashcardsViewProps {
  workspaceId: string;
}

interface Notification {
  message: string;
  success: boolean;
}

// ---------------------------------------------------------------------------
// Helpers — convert API types to local component types
// ---------------------------------------------------------------------------

function toLocalSet(apiSet: FlashcardSet | FlashcardSetWithCards): LocalFlashcardSet {
  const cards: LocalFlashcard[] = "cards" in apiSet && apiSet.cards
    ? apiSet.cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
      }))
    : [];

  // Compute knownIds from card statuses
  const knownIds = "cards" in apiSet && apiSet.cards
    ? apiSet.cards.filter((c) => c.status === "known").map((c) => c.id)
    : [];

  return {
    id: apiSet.id,
    title: apiSet.title,
    resourceId: apiSet.source_ids[0] ?? "",
    resourceName: `${apiSet.source_ids.length} resource${apiSet.source_ids.length !== 1 ? "s" : ""}`,
    cards,
    createdAt: apiSet.created_at,
    knownIds,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlashcardsView({
  workspaceId,
}: FlashcardsViewProps) {
  const [sets, setSets] = useState<LocalFlashcardSet[]>([]);
  const [studyingSet, setStudyingSet] = useState<LocalFlashcardSet | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Track pending set IDs for polling
  const pendingSetIds = useRef<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Fetch sets on mount
  // ---------------------------------------------------------------------------

  const fetchSets = useCallback(async () => {
    try {
      const apiSets = await getWorkspaceFlashcardSets(workspaceId);

      // For each set, fetch full details to get cards
      const fullSets = await Promise.all(
        apiSets.map(async (s) => {
          if (s.status === "ready") {
            const full = await getFlashcardSetById(s.id);
            return toLocalSet(full);
          }
          // For pending/processing sets, return placeholder
          return toLocalSet(s);
        })
      );

      setSets(fullSets);

      // Track pending sets for polling
      const pending = apiSets.filter((s) => s.status === "pending" || s.status === "processing");
      pendingSetIds.current = new Set(pending.map((s) => s.id));

    } catch (err) {
      console.error("[FlashcardsView] Failed to fetch sets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  // ---------------------------------------------------------------------------
  // Poll pending sets
  // ---------------------------------------------------------------------------

  // State to trigger polling when new pending sets are added
  const [pollTrigger, setPollTrigger] = useState(0);

  useEffect(() => {
    if (pendingSetIds.current.size === 0) return;

    const pollInterval = setInterval(async () => {
      const pendingIds = Array.from(pendingSetIds.current);
      if (pendingIds.length === 0) {
        clearInterval(pollInterval);
        return;
      }

      for (const id of pendingIds) {
        try {
          const full = await getFlashcardSetById(id);
          if (full.status === "ready") {
            pendingSetIds.current.delete(id);
            setSets((prev) =>
              prev.map((s) => (s.id === id ? toLocalSet(full) : s))
            );
            setNotification({ message: "Flashcard set ready!", success: true });
            setIsGenerating(false);
          } else if (full.status === "failed") {
            pendingSetIds.current.delete(id);
            setSets((prev) => prev.filter((s) => s.id !== id));
            setNotification({
              message: full.error_message || "Generation failed",
              success: false,
            });
            setIsGenerating(false);
          }
        } catch (err) {
          console.error(`[FlashcardsView] Poll error for set ${id}:`, err);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pollTrigger]);

  // Auto-dismiss notification after 3.5 s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleGenerate = async (
    resourceIds: string[],
    topic: string,
    cardCount: number
  ) => {
    setIsGenerating(true);
    setShowPanel(false);
    setNotification({ message: "Generating flashcards… This may take a minute.", success: true });

    try {
      const newSet = await generateFlashcards(
        workspaceId,
        resourceIds,
        topic || undefined,
        cardCount
      );

      // Add placeholder set to UI
      setSets((prev) => [toLocalSet(newSet), ...prev]);

      // Track for polling and trigger the polling effect
      pendingSetIds.current.add(newSet.id);
      setPollTrigger((t) => t + 1);

    } catch (err) {
      console.error("[FlashcardsView] Generation failed:", err);
      setNotification({
        message: err instanceof Error ? err.message : "Failed to generate flashcards",
        success: false,
      });
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFlashcardSet(id);
      setSets((prev) => prev.filter((s) => s.id !== id));
      pendingSetIds.current.delete(id);
    } catch (err) {
      console.error("[FlashcardsView] Delete failed:", err);
      setNotification({
        message: err instanceof Error ? err.message : "Failed to delete set",
        success: false,
      });
    }
  };

  const handleStudy = async (set: LocalFlashcardSet) => {
    // If cards are empty (pending set), fetch full data first
    if (set.cards.length === 0) {
      try {
        const full = await getFlashcardSetById(set.id);
        if (full.status === "ready" && full.cards.length > 0) {
          const localSet = toLocalSet(full);
          setSets((prev) => prev.map((s) => (s.id === set.id ? localSet : s)));
          setStudyingSet(localSet);
        } else {
          setNotification({ message: "Set is still generating…", success: false });
        }
      } catch (err) {
        console.error("[FlashcardsView] Failed to fetch set for study:", err);
      }
    } else {
      setStudyingSet(set);
    }
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
              ? "rgba(80, 125, 188, 0.1)"
              : "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(80, 125, 188, 0.12)",
            color: notification.success
              ? "var(--color-blue-accent)"
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
          <PageHeader 
            icon={<SquareStack size={22} color="#507DBC" strokeWidth={1.8} fill="none" />}
            title="Flashcards"
            description="AI-generated study cards from your resources"
          />

          <div className="flex items-center gap-3">
            {sets.length > 0 && (
              <div className="relative w-64 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search flashcard sets by title"
                  className="w-full bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-lg pl-10 pr-9 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-white/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <PrimaryButton
              onClick={() => setShowPanel((v) => !v)}
              icon={Plus}
              label="Generate"
            />
          </div>
        </div>

        {/* Generation panel (slide-in) */}
        {showPanel && (
          <FlashcardGenerationPanel
            workspaceId={workspaceId}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onClose={() => setShowPanel(false)}
          />
        )}

        {/* Body */}
        {isLoading || isGenerating ? (
          <GenerationShimmer />
        ) : sets.length === 0 ? (
          <EmptyState
            onGenerate={() => setShowPanel(true)}
          />
        ) : (() => {
          const normalizedQuery = searchQuery.trim().toLowerCase();
          const filteredSets = normalizedQuery
            ? sets.filter((s) => s.title.toLowerCase().includes(normalizedQuery))
            : sets;
          if (filteredSets.length === 0) {
            return (
              <div className="py-12 text-center text-text-muted text-sm">
                No flashcard sets match &quot;{searchQuery}&quot;.
              </div>
            );
          }
          return (
            <FlashcardSetGrid
              sets={filteredSets}
              onStudy={handleStudy}
              onDelete={handleDelete}
            />
          );
        })()}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generation shimmer skeleton
// ---------------------------------------------------------------------------

function GenerationShimmer() {
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
            className="rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] p-5 flex flex-col gap-3.5"
            style={{ opacity: 1 - i * 0.18 }}
          >
            {/* Title line */}
            <div className="relative overflow-hidden rounded-md h-4 bg-white/5">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
                }}
              />
            </div>
            {/* Sub line */}
            <div className="relative overflow-hidden rounded-md h-3 bg-white/5 w-2/3">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)",
                  animationDelay: "0.15s",
                }}
              />
            </div>
            {/* Third line */}
            <div className="relative overflow-hidden rounded-md h-3 bg-white/5 w-1/2">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)",
                  animationDelay: "0.3s",
                }}
              />
            </div>
            {/* Progress bar */}
            <div className="mt-1 relative overflow-hidden rounded-full h-1 bg-white/5">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)",
                  animationDelay: "0.05s",
                }}
              />
            </div>
            {/* Button ghost */}
            <div className="relative overflow-hidden rounded-lg h-8 bg-white/5 mt-1">
              <div
                className="fc-shimmer absolute inset-y-0 w-1/2"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)",
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
  onGenerate,
}: {
  onGenerate: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 relative overflow-hidden min-h-[400px]">
      {/* Icon */}
      <div
        className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <WalletCards className="w-10 h-10" style={{ color: "var(--color-blue-accent)" }} />
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
      <PrimaryButton
        onClick={onGenerate}
        icon={Sparkles}
        label="Generate Your First Set"
      />
    </div>
  );
}
