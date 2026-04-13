import type { QuestionType, AttemptStatus } from "@/types/quiz";

// ---------------------------------------------------------------------------
// Quiz-specific Colors
// ---------------------------------------------------------------------------

/** Quiz accent color (green) for completed/correct states */
export const QUIZ_GREEN = "#00E5A0";
export const QUIZ_GREEN_RGB = "0, 229, 160";
/** Dark text for contrast on QUIZ_GREEN background */
export const QUIZ_GREEN_CONTRAST = "#000000";

/** In-progress accent color (amber) */
export const QUIZ_AMBER = "#F59E0B";
export const QUIZ_AMBER_RGB = "245, 158, 11";
/** Dark text for contrast on QUIZ_AMBER background */
export const QUIZ_AMBER_CONTRAST = "#000000";

/** Error/wrong answer color */
export const QUIZ_RED = "#EF4444";
export const QUIZ_RED_RGB = "239, 68, 68";
/** Light text for contrast on QUIZ_RED background */
export const QUIZ_RED_CONTRAST = "#ffffff";

// ---------------------------------------------------------------------------
// Bear Emotion States
// ---------------------------------------------------------------------------

export type BearEmotion =
  | "idle"
  | "thinking"
  | "happy"
  | "sad"
  | "celebrating"
  | "disappointed";

// Fallback animation URLs from LottieFiles (public domain bears)
export const BEAR_FALLBACK_ANIMATIONS: Record<BearEmotion, string> = {
  idle: "https://assets3.lottiefiles.com/packages/lf20_jcikwtux.json",
  thinking: "https://assets3.lottiefiles.com/packages/lf20_t9gkkhz4.json",
  happy: "https://assets3.lottiefiles.com/packages/lf20_u4yrau.json",
  sad: "https://assets3.lottiefiles.com/packages/lf20_qp1q7mct.json",
  celebrating: "https://assets3.lottiefiles.com/packages/lf20_touohxv0.json",
  disappointed: "https://assets3.lottiefiles.com/packages/lf20_qp1q7mct.json",
};

// ---------------------------------------------------------------------------
// Question Type Options
// ---------------------------------------------------------------------------

export const QUESTION_TYPE_OPTIONS: { id: QuestionType; label: string; description: string }[] = [
  { id: "mcq", label: "MCQ", description: "Multiple choice" },
  { id: "scenario", label: "Scenario", description: "Case-based" },
  { id: "mixed", label: "Mixed", description: "Mix of both" },
];

// ---------------------------------------------------------------------------
// Question Count Options
// ---------------------------------------------------------------------------

export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
export type QuestionCountOption = (typeof QUESTION_COUNT_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Generation Status Messages
// ---------------------------------------------------------------------------

export const GENERATION_STATUS_MESSAGES = [
  "Analysing resources…",
  "Building questions…",
  "Crafting answer options…",
  "Adding explanations…",
  "Almost ready…",
];

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/** Pass threshold percentage */
export const PASS_THRESHOLD = 60;

/** Check if a score is passing */
export function isPassing(score: number, total: number): boolean {
  if (total === 0) return false;
  return (score / total) * 100 >= PASS_THRESHOLD;
}

/** Get status variant colors based on attempt status */
export function getStatusColors(status: AttemptStatus): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  if (status === "in_progress") {
    return {
      bg: `rgba(${QUIZ_AMBER_RGB}, 0.12)`,
      text: QUIZ_AMBER,
      border: `rgba(${QUIZ_AMBER_RGB}, 0.3)`,
      glow: `0 0 20px rgba(${QUIZ_AMBER_RGB}, 0.2)`,
    };
  }
  return {
    bg: `rgba(${QUIZ_GREEN_RGB}, 0.12)`,
    text: QUIZ_GREEN,
    border: `rgba(${QUIZ_GREEN_RGB}, 0.3)`,
    glow: `0 0 20px rgba(${QUIZ_GREEN_RGB}, 0.2)`,
  };
}

/** Format date for quiz cards */
export function formatQuizDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format progress text (e.g., "6 / 10 answered") */
export function formatProgress(answered: number, total: number): string {
  return `${answered} / ${total} answered`;
}

/** Calculate progress percentage */
export function calculateProgressPercentage(answered: number, total: number): number {
  if (total === 0) return 0;
  return (answered / total) * 100;
}

/** Get question type display label */
export function getQuestionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_OPTIONS.find((opt) => opt.id === type)?.label ?? type;
}

/** Option labels for answers */
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/** Polling interval for quiz generation status */
export const POLLING_INTERVAL_MS = 3000;

/** Message cycle interval during generation */
export const MESSAGE_CYCLE_INTERVAL_MS = 2500;
