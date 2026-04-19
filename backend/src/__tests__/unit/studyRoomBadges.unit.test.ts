/**
 * studyRoomBadges unit tests
 *
 * Pure logic tests for computeBadges(). No I/O mocking needed.
 */

import { computeBadges } from "../../utils/studyRoomBadges";
import type { AnswerRecord } from "../../utils/studyRoomBadges";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const T0 = "2024-01-01T12:00:00.000Z";
const T1 = "2024-01-01T12:00:01.000Z";
const T2 = "2024-01-01T12:00:02.000Z";
const T3 = "2024-01-01T12:00:03.000Z";

function makeAnswer(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  pointsEarned: number,
  answeredAt = T0,
): AnswerRecord {
  return { userId, questionId, isCorrect, pointsEarned, answeredAt };
}

// ---------------------------------------------------------------------------
// 🥇 First Place
// ---------------------------------------------------------------------------

describe("computeBadges — 🥇 First Place", () => {
  it("awards 🥇 to participant with highest points", () => {
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100),
      makeAnswer("alice", "q2", true, 100),
      makeAnswer("bob", "q1", false, 0),
      makeAnswer("bob", "q2", true, 100),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 2);
    const firstPlaceBadges = badges.filter((b) => b.type === "first_place");

    expect(firstPlaceBadges).toHaveLength(1);
    expect(firstPlaceBadges[0].user_id).toBe("alice");
    expect(firstPlaceBadges[0].icon).toBe("🥇");
  });

  it("awards 🥇 to both participants on exact tie", () => {
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100),
      makeAnswer("bob", "q1", true, 100),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 1);
    const firstPlaceBadges = badges.filter((b) => b.type === "first_place");

    expect(firstPlaceBadges).toHaveLength(2);
    const winnerIds = firstPlaceBadges.map((b) => b.user_id).sort();
    expect(winnerIds).toEqual(["alice", "bob"].sort());
  });
});

// ---------------------------------------------------------------------------
// 🔥 Perfect Score
// ---------------------------------------------------------------------------

describe("computeBadges — 🔥 Perfect Score", () => {
  it("awards 🔥 to participant with a perfect score", () => {
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100),
      makeAnswer("alice", "q2", true, 100),
      makeAnswer("bob", "q1", true, 100),
      makeAnswer("bob", "q2", false, 0),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 2);
    const perfBadges = badges.filter((b) => b.type === "perfect_score");

    expect(perfBadges).toHaveLength(1);
    expect(perfBadges[0].user_id).toBe("alice");
    expect(perfBadges[0].icon).toBe("🔥");
  });

  it("does not award 🔥 if no one is perfect", () => {
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", false, 0),
      makeAnswer("alice", "q2", true, 100),
      makeAnswer("bob", "q1", true, 100),
      makeAnswer("bob", "q2", false, 0),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 2);
    const perfBadges = badges.filter((b) => b.type === "perfect_score");

    expect(perfBadges).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ⚡ First to Answer
// ---------------------------------------------------------------------------

describe("computeBadges — ⚡ First to Answer", () => {
  it("awards ⚡ to participant who answered first most often", () => {
    // alice answered q1 first (T0 < T1), alice answered q2 first (T0 < T1)
    // bob answered q3 first (T0 < T2)
    // alice is first on 2/3 questions → gets ⚡
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100, T0),
      makeAnswer("bob", "q1", true, 100, T1),
      makeAnswer("alice", "q2", true, 100, T0),
      makeAnswer("bob", "q2", true, 100, T1),
      makeAnswer("bob", "q3", true, 100, T0),
      makeAnswer("alice", "q3", true, 100, T2),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 3);
    const fastBadges = badges.filter((b) => b.type === "first_to_answer");

    expect(fastBadges).toHaveLength(1);
    expect(fastBadges[0].user_id).toBe("alice");
    expect(fastBadges[0].icon).toBe("⚡");
  });
});

// ---------------------------------------------------------------------------
// 💀 Last Place
// ---------------------------------------------------------------------------

describe("computeBadges — 💀 Last Place", () => {
  it("awards 💀 to lowest scorer who answered all questions (3+ participants)", () => {
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100),
      makeAnswer("bob", "q1", true, 100),
      makeAnswer("carol", "q1", false, 0),
    ];

    const badges = computeBadges(["alice", "bob", "carol"], answers, 1);
    const lastBadges = badges.filter((b) => b.type === "last_place");

    expect(lastBadges).toHaveLength(1);
    expect(lastBadges[0].user_id).toBe("carol");
    expect(lastBadges[0].icon).toBe("💀");
  });

  it("does not award 💀 if only 2 participants", () => {
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100),
      makeAnswer("bob", "q1", false, 0),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 1);
    const lastBadges = badges.filter((b) => b.type === "last_place");

    expect(lastBadges).toHaveLength(0);
  });

  it("does not award 💀 if the lowest scorer is also the winner (all tied at 0)", () => {
    // All 3 have 0 points → all win 🥇 (tie) → 💀 should not be awarded because
    // the lowest scorer is also a winner
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", false, 0),
      makeAnswer("bob", "q1", false, 0),
      makeAnswer("carol", "q1", false, 0),
    ];

    const badges = computeBadges(["alice", "bob", "carol"], answers, 1);
    const lastBadges = badges.filter((b) => b.type === "last_place");

    expect(lastBadges).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple badges
// ---------------------------------------------------------------------------

describe("computeBadges — multiple badges", () => {
  it("a single participant can hold multiple badges", () => {
    // alice: highest points + perfect score + first to answer most
    const answers: AnswerRecord[] = [
      makeAnswer("alice", "q1", true, 100, T0),
      makeAnswer("alice", "q2", true, 100, T0),
      makeAnswer("bob", "q1", false, 0, T1),
      makeAnswer("bob", "q2", false, 0, T1),
    ];

    const badges = computeBadges(["alice", "bob"], answers, 2);
    const aliceBadges = badges.filter((b) => b.user_id === "alice");

    const types = aliceBadges.map((b) => b.type);
    expect(types).toContain("first_place");
    expect(types).toContain("perfect_score");
    expect(types).toContain("first_to_answer");
    expect(aliceBadges.length).toBeGreaterThanOrEqual(3);
  });
});
