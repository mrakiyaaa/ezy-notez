import type { AuraProps } from "../summarization/constants";

export type { AuraProps };

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  resourceId: string;
  resourceName: string;
  cards: Flashcard[];
  createdAt: string;
  knownIds: string[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function formatFlashcardDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Mock data (replace with real API responses)
// ---------------------------------------------------------------------------

export const MOCK_FLASHCARD_SETS: FlashcardSet[] = [
  {
    id: "mock-1",
    title: "Machine Learning Fundamentals",
    resourceId: "r1",
    resourceName: "ML_Lecture_Notes.pdf",
    createdAt: "2026-03-30T10:00:00Z",
    knownIds: ["mc2", "mc3"],
    cards: [
      {
        id: "mc1",
        front: "What is supervised learning?",
        back: "A machine learning paradigm where the model trains on labeled input-output pairs to learn a mapping function, enabling accurate prediction on unseen data.",
      },
      {
        id: "mc2",
        front: "Define overfitting",
        back: "When a model learns the training data too well — capturing noise and random fluctuations — resulting in poor generalization to new, unseen data.",
      },
      {
        id: "mc3",
        front: "What is a neural network?",
        back: "A computational model inspired by biological brains, consisting of layers of interconnected nodes (neurons) that transform inputs through weighted connections and activation functions.",
      },
      {
        id: "mc4",
        front: "What is gradient descent?",
        back: "An iterative optimization algorithm that adjusts model parameters in the direction of steepest descent of the loss function, minimizing prediction error over training.",
      },
      {
        id: "mc5",
        front: "Explain regularization",
        back: "Techniques (L1 lasso, L2 ridge, dropout) that add a complexity penalty to the loss function, discouraging overly complex models and improving generalization.",
      },
    ],
  },
  {
    id: "mock-2",
    title: "Data Structures Overview",
    resourceId: "r2",
    resourceName: "DSA_Chapter3.pdf",
    createdAt: "2026-03-28T14:30:00Z",
    knownIds: [],
    cards: [
      {
        id: "dc1",
        front: "What is a binary search tree?",
        back: "A binary tree with the BST property: for every node, all keys in the left subtree are strictly smaller and all keys in the right subtree are strictly greater.",
      },
      {
        id: "dc2",
        front: "Explain Big O notation",
        back: "A mathematical notation describing the asymptotic upper bound of an algorithm's time or space complexity as a function of input size n, ignoring constant factors.",
      },
      {
        id: "dc3",
        front: "What is dynamic programming?",
        back: "An optimization technique that solves complex problems by decomposing them into overlapping subproblems, storing intermediate results (memoization) to avoid redundant computation.",
      },
    ],
  },
];
