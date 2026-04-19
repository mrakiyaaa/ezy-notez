import { supabaseAdmin } from "../config/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityStatus = "pending" | "in-progress" | "done";

export interface HubActivity {
  id: string;
  title: string;
  category: string;
  status: ActivityStatus;
  progress: number;
  dueAt: string;
}

export interface HubAnalytics {
  activities: HubActivity[];
  briefing: string[];
}

// ---------------------------------------------------------------------------
// Data gathering helpers
// ---------------------------------------------------------------------------

interface StudyRoomRow {
  id: string;
  title: string;
  status: "waiting" | "in_progress" | "completed";
  workspace_id: string;
  host_id: string;
  created_at: string;
  question_count: number;
}

const getUserWorkspaceIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((w: { id: string }) => w.id);
};

const getHostedActiveRooms = async (userId: string): Promise<StudyRoomRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("study_rooms")
    .select("id, title, status, workspace_id, host_id, created_at, question_count")
    .eq("host_id", userId)
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data as StudyRoomRow[];
};

const getParticipatingActiveRooms = async (
  userId: string,
): Promise<StudyRoomRow[]> => {
  const { data: parts } = await supabaseAdmin
    .from("study_room_participants")
    .select("room_id, is_host")
    .eq("user_id", userId)
    .eq("is_host", false);

  const ids = (parts ?? []).map((p: { room_id: string }) => p.room_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("study_rooms")
    .select("id, title, status, workspace_id, host_id, created_at, question_count")
    .in("id", ids)
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data as StudyRoomRow[];
};

interface PendingQuizRow {
  id: string;
  title: string;
  workspace_id: string;
  created_at: string;
  question_count: number;
}

/**
 * Quizzes in the user's workspaces that are `ready` and have no `completed`
 * attempt from this user. These represent work the user can pick up.
 */
const getPendingQuizzes = async (
  userId: string,
  workspaceIds: string[],
): Promise<PendingQuizRow[]> => {
  if (workspaceIds.length === 0) return [];

  const { data: quizzes, error } = await supabaseAdmin
    .from("quizzes")
    .select("id, title, workspace_id, created_at, question_count")
    .in("workspace_id", workspaceIds)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !quizzes || quizzes.length === 0) return [];

  const quizIds = quizzes.map((q: { id: string }) => q.id);
  const { data: attempts } = await supabaseAdmin
    .from("quiz_attempts")
    .select("quiz_id, status")
    .in("quiz_id", quizIds)
    .eq("user_id", userId)
    .eq("status", "completed");

  const completedSet = new Set(
    (attempts ?? []).map((a: { quiz_id: string }) => a.quiz_id),
  );

  return (quizzes as PendingQuizRow[]).filter((q) => !completedSet.has(q.id));
};

const getPendingInviteCount = async (userEmail: string): Promise<number> => {
  const { count } = await supabaseAdmin
    .from("study_room_invites")
    .select("id", { count: "exact", head: true })
    .eq("email", userEmail)
    .eq("status", "pending");

  return count ?? 0;
};

const getRecentResourceCount = async (
  workspaceIds: string[],
  sinceIso: string,
): Promise<number> => {
  if (workspaceIds.length === 0) return 0;

  const { count } = await supabaseAdmin
    .from("resources")
    .select("id", { count: "exact", head: true })
    .in("workspace_id", workspaceIds)
    .gte("created_at", sinceIso);

  return count ?? 0;
};

const getFlashcardSetCount = async (workspaceIds: string[]): Promise<number> => {
  if (workspaceIds.length === 0) return 0;

  const { count } = await supabaseAdmin
    .from("flashcard_sets")
    .select("id", { count: "exact", head: true })
    .in("workspace_id", workspaceIds);

  return count ?? 0;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const pluralize = (n: number, singular: string, plural?: string): string =>
  `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`;

/**
 * Compute activities + daily briefing for the workspace hub sidebar by
 * aggregating across study rooms, quizzes, resources, and flashcards.
 */
export const getHubAnalytics = async (
  userId: string,
  userEmail: string,
): Promise<HubAnalytics> => {
  const workspaceIds = await getUserWorkspaceIds(userId);
  const oneWeekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    hostedRooms,
    participatingRooms,
    pendingQuizzes,
    pendingInviteCount,
    recentResourceCount,
    flashcardSetCount,
  ] = await Promise.all([
    getHostedActiveRooms(userId),
    getParticipatingActiveRooms(userId),
    getPendingQuizzes(userId, workspaceIds),
    getPendingInviteCount(userEmail),
    getRecentResourceCount(workspaceIds, oneWeekAgoIso),
    getFlashcardSetCount(workspaceIds),
  ]);

  // ── Activities: cross-feature "things waiting for you" ──────────────────
  const activities: HubActivity[] = [];

  for (const room of hostedRooms) {
    activities.push({
      id: `room-host-${room.id}`,
      title: room.title,
      category: room.status === "waiting" ? "Study Room · Hosting" : "Study Room · Live",
      status: room.status === "in_progress" ? "in-progress" : "pending",
      progress: room.status === "in_progress" ? 50 : 0,
      dueAt: room.created_at,
    });
  }

  for (const room of participatingRooms) {
    activities.push({
      id: `room-join-${room.id}`,
      title: room.title,
      category: room.status === "in_progress" ? "Study Room · Live" : "Study Room · Lobby",
      status: room.status === "in_progress" ? "in-progress" : "pending",
      progress: room.status === "in_progress" ? 50 : 0,
      dueAt: room.created_at,
    });
  }

  for (const quiz of pendingQuizzes.slice(0, 5)) {
    activities.push({
      id: `quiz-${quiz.id}`,
      title: quiz.title,
      category: "Quiz · Unattempted",
      status: "pending",
      progress: 0,
      dueAt: quiz.created_at,
    });
  }

  // Sort activities so pending/in-progress surface first, newest first.
  activities.sort((a, b) => {
    if (a.status !== b.status) {
      const rank = { "in-progress": 0, pending: 1, done: 2 };
      return rank[a.status] - rank[b.status];
    }
    return new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime();
  });

  // ── Briefing: short human-readable sentences summarising pending work ──
  const briefing: string[] = [];

  if (pendingInviteCount > 0) {
    briefing.push(
      `${pluralize(pendingInviteCount, "study room invite")} awaiting your response.`,
    );
  }

  const waitingHosted = hostedRooms.filter((r) => r.status === "waiting").length;
  if (waitingHosted > 0) {
    briefing.push(
      `${pluralize(waitingHosted, "room")} you're hosting ${waitingHosted === 1 ? "is" : "are"} ready to start.`,
    );
  }

  const liveRooms =
    hostedRooms.filter((r) => r.status === "in_progress").length +
    participatingRooms.filter((r) => r.status === "in_progress").length;
  if (liveRooms > 0) {
    briefing.push(
      `${pluralize(liveRooms, "live study room")} to rejoin.`,
    );
  }

  if (pendingQuizzes.length > 0) {
    briefing.push(
      `${pluralize(pendingQuizzes.length, "quiz", "quizzes")} ready to attempt across your workspaces.`,
    );
  }

  if (recentResourceCount > 0) {
    briefing.push(
      `${pluralize(recentResourceCount, "resource")} added in the last 7 days.`,
    );
  }

  if (briefing.length === 0) {
    // Fallback: positive summary when nothing is pending.
    if (flashcardSetCount > 0) {
      briefing.push(
        `${pluralize(flashcardSetCount, "flashcard set")} available to review.`,
      );
    }
    briefing.push("All caught up — no urgent items right now.");
  }

  return {
    activities: activities.slice(0, 6),
    briefing: briefing.slice(0, 4),
  };
};
