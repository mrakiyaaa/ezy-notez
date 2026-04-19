/**
 * studyRoomBadges.ts
 *
 * Pure utility for computing badges across all participants in a study room.
 * No I/O — all data is passed in.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnswerRecord {
  userId: string;
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string; // ISO timestamp
}

export interface BadgeResult {
  type: string;
  label: string;
  icon: string;
  user_id: string;
}

// ---------------------------------------------------------------------------
// computeBadges
// ---------------------------------------------------------------------------

/**
 * Compute badges for all participants in a completed study room.
 *
 * Badge rules:
 *  🥇 First Place       — participant(s) with the highest total points
 *  🔥 Perfect Score     — participant who answered ALL questions correctly
 *  ⚡ First to Answer   — participant who was first to answer the most questions
 *  💀 Last Place        — lowest-scoring participant who answered all questions
 *                         (only awarded when 3+ participants; never awarded to winner)
 *
 * A single participant can earn multiple badges simultaneously.
 */
export function computeBadges(
  userIds: string[],
  answers: AnswerRecord[],
  totalQuestions: number,
): BadgeResult[] {
  if (userIds.length === 0) return [];

  const badges: BadgeResult[] = [];

  // ── Group answers by user ─────────────────────────────────────────────────
  const answersByUser = new Map<string, AnswerRecord[]>();
  for (const uid of userIds) answersByUser.set(uid, []);
  for (const a of answers) answersByUser.get(a.userId)?.push(a);

  // ── Total points per user ────────────────────────────────────────────────
  const pointsByUser = new Map<string, number>();
  for (const [uid, ua] of answersByUser) {
    pointsByUser.set(uid, ua.reduce((sum, a) => sum + a.pointsEarned, 0));
  }

  // ── 🥇 First Place ────────────────────────────────────────────────────────
  const allPoints = Array.from(pointsByUser.values());
  const maxPoints = allPoints.length > 0 ? Math.max(...allPoints) : 0;
  const winnerIds = new Set<string>();

  for (const [uid, pts] of pointsByUser) {
    if (pts === maxPoints) {
      winnerIds.add(uid);
      badges.push({ type: "first_place", label: "First Place", icon: "🥇", user_id: uid });
    }
  }

  // ── 🔥 Perfect Score ─────────────────────────────────────────────────────
  if (totalQuestions > 0) {
    for (const [uid, ua] of answersByUser) {
      if (ua.length === totalQuestions && ua.every((a) => a.isCorrect)) {
        badges.push({ type: "perfect_score", label: "Perfect Score", icon: "🔥", user_id: uid });
      }
    }
  }

  // ── ⚡ First to Answer ────────────────────────────────────────────────────
  if (answers.length > 0) {
    const answersByQuestion = new Map<string, AnswerRecord[]>();
    for (const a of answers) {
      if (!answersByQuestion.has(a.questionId)) answersByQuestion.set(a.questionId, []);
      answersByQuestion.get(a.questionId)!.push(a);
    }

    const firstCountByUser = new Map<string, number>();
    for (const uid of userIds) firstCountByUser.set(uid, 0);

    for (const qAnswers of answersByQuestion.values()) {
      if (qAnswers.length === 0) continue;
      const earliest = qAnswers.reduce((a, b) =>
        new Date(a.answeredAt).getTime() <= new Date(b.answeredAt).getTime() ? a : b,
      );
      firstCountByUser.set(earliest.userId, (firstCountByUser.get(earliest.userId) ?? 0) + 1);
    }

    const maxFirstCount = Math.max(...Array.from(firstCountByUser.values()));
    if (maxFirstCount > 0) {
      for (const [uid, count] of firstCountByUser) {
        if (count === maxFirstCount) {
          badges.push({
            type: "first_to_answer",
            label: "First to Answer",
            icon: "⚡",
            user_id: uid,
          });
        }
      }
    }
  }

  // ── 💀 Last Place (3+ participants only, not the winner) ─────────────────
  if (userIds.length >= 3) {
    const allPts = Array.from(pointsByUser.values());
    const minPoints = Math.min(...allPts);

    for (const [uid, pts] of pointsByUser) {
      const ua = answersByUser.get(uid) ?? [];
      if (pts === minPoints && ua.length === totalQuestions && !winnerIds.has(uid)) {
        badges.push({
          type: "last_place",
          label: "Participation Trophy",
          icon: "💀",
          user_id: uid,
        });
      }
    }
  }

  return badges;
}
