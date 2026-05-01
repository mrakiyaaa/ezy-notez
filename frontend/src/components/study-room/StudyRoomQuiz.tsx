"use client";

import { useState, useEffect, useReducer, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronRight, AlertTriangle } from "lucide-react";
import type { StudyRoom, Participant, StudyRoomQuestion } from "@/types/studyRoom";
import {
  getCurrentQuestion,
  submitAnswer,
  nextQuestion as nextQuestionService,
  getLobbyParticipants,
} from "@/services/studyRoom.service";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import PointsCounter from "./PointsCounter";
import ParticipantAvatar from "./ParticipantAvatar";
import DisconnectModal from "./DisconnectModal";

interface StudyRoomQuizProps {
  room: StudyRoom;
  fromWorkspaceId?: string;
}

interface QuizState {
  currentQuestion: StudyRoomQuestion | null;
  selectedAnswer: number | null;
  confirmedAnswer: number | null;
  answerRevealed: boolean;
  userPoints: number;
  isCorrect: boolean | null;
  explanation: string | null;
}

type QuizAction =
  | { type: "SET_QUESTION"; question: StudyRoomQuestion }
  | { type: "SELECT_ANSWER"; index: number }
  | { type: "CONFIRM_ANSWER" }
  | {
      type: "REVEAL_ANSWER";
      correctAnswer: number;
      explanation: string;
      pointsEarned: number;
    }
  | { type: "NEXT_QUESTION"; question: StudyRoomQuestion };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_QUESTION":
      return {
        ...state,
        currentQuestion: action.question,
        selectedAnswer: null,
        confirmedAnswer: null,
        answerRevealed: false,
        isCorrect: null,
        explanation: null,
      };
    case "SELECT_ANSWER":
      if (state.confirmedAnswer !== null) return state;
      return { ...state, selectedAnswer: action.index };
    case "CONFIRM_ANSWER":
      return { ...state, confirmedAnswer: state.selectedAnswer };
    case "REVEAL_ANSWER":
      return {
        ...state,
        answerRevealed: true,
        isCorrect: state.confirmedAnswer === action.correctAnswer,
        explanation: action.explanation,
        userPoints: state.userPoints + action.pointsEarned,
      };
    case "NEXT_QUESTION":
      return {
        ...state,
        currentQuestion: action.question,
        selectedAnswer: null,
        confirmedAnswer: null,
        answerRevealed: false,
        isCorrect: null,
        explanation: null,
      };
    default:
      return state;
  }
}

const CORRECT_ANSWER_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

function normaliseQuestion(q: StudyRoomQuestion): StudyRoomQuestion {
  if (q.options && !Array.isArray(q.options)) {
    const obj = q.options as Record<string, string>;
    return {
      ...q,
      options: [obj.A ?? "", obj.B ?? "", obj.C ?? "", obj.D ?? ""],
      correct_answer:
        typeof q.correct_answer === "string" && isNaN(Number(q.correct_answer))
          ? CORRECT_ANSWER_INDEX[q.correct_answer as string] ?? 0
          : Number(q.correct_answer),
    };
  }
  return q;
}

export default function StudyRoomQuiz({ room, fromWorkspaceId }: StudyRoomQuizProps) {
  const router = useRouter();
  const fromQuery = fromWorkspaceId ? `?from=${fromWorkspaceId}` : "";

  const goToResults = useCallback(() => {
    router.push(`/study-rooms/${room.id}/results${fromQuery}`);
  }, [router, room.id, fromQuery]);

  const [state, dispatch] = useReducer(quizReducer, {
    currentQuestion: null,
    selectedAnswer: null,
    confirmedAnswer: null,
    answerRevealed: false,
    userPoints: 0,
    isCorrect: null,
    explanation: null,
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectedUser, setDisconnectedUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allConfirmed, setAllConfirmed] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const isHost = !!currentUserId && room.host_id === currentUserId;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(`ezn_room_first_question_${room.id}`);
    if (stored) {
      try {
        const q = JSON.parse(stored) as StudyRoomQuestion;
        sessionStorage.removeItem(`ezn_room_first_question_${room.id}`);
        dispatch({ type: "SET_QUESTION", question: normaliseQuestion(q) });
        getLobbyParticipants(room.id)
          .then(setParticipants)
          .catch(console.error)
          .finally(() => setIsLoading(false));
        return;
      } catch {
        // fall through to API fetch
      }
    }

    Promise.all([getCurrentQuestion(room.id), getLobbyParticipants(room.id)])
      .then(([question, parts]) => {
        dispatch({ type: "SET_QUESTION", question: normaliseQuestion(question) });
        setParticipants(parts);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [room.id]);

  useEffect(() => {
    const channel = supabase.channel(`study-room:${room.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "answer:confirmed" }, (payload) => {
        try {
          const data = payload.payload as {
            userId?: string;
            allConfirmed?: boolean;
          };
          const userId = data?.userId;
          if (userId) {
            setParticipants((prev) =>
              prev.map((p) =>
                p.user_id === userId ? { ...p, has_confirmed: true } : p
              )
            );
          }
          if (data?.allConfirmed) {
            setAllConfirmed(true);
          }
        } catch (err) {
          console.error("[Quiz] answer:confirmed handler error:", err);
        }
      })
      .on("broadcast", { event: "question:next" }, (payload) => {
        try {
          const data = payload.payload as {
            question?: StudyRoomQuestion;
            previousAnswer?: { correct_answer: string | number; explanation: string };
          };

          const prevAnswer = data?.previousAnswer;
          const rawCorrect = prevAnswer?.correct_answer;
          const correctIndex =
            typeof rawCorrect === "string" && isNaN(Number(rawCorrect))
              ? CORRECT_ANSWER_INDEX[rawCorrect] ?? 0
              : Number(rawCorrect ?? 0);

          dispatch({
            type: "REVEAL_ANSWER",
            correctAnswer: correctIndex,
            explanation: prevAnswer?.explanation ?? "",
            pointsEarned: 0,
          });

          if (data?.question) {
            setTimeout(() => {
              dispatch({
                type: "NEXT_QUESTION",
                question: normaliseQuestion(data.question!),
              });
              setParticipants((prev) =>
                prev.map((p) => ({ ...p, has_confirmed: false }))
              );
              setAllConfirmed(false);
            }, 2500);
          }
        } catch (err) {
          console.error("[Quiz] question:next handler error:", err);
        }
      })
      .on("broadcast", { event: "participant:disconnected" }, (payload) => {
        try {
          const name =
            (payload.payload as { name?: string })?.name ?? "A participant";
          if (isHost) {
            setDisconnectedUser(name);
          }
        } catch (err) {
          console.error("[Quiz] participant:disconnected handler error:", err);
        }
      })
      .on("broadcast", { event: "room:ended" }, () => {
        try {
          goToResults();
        } catch (err) {
          console.error("[Quiz] room:ended handler error:", err);
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setChannelError("Lost connection to room. Please refresh the page.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room.id, isHost, goToResults]);

  const handleSelectAnswer = (index: number) => {
    dispatch({ type: "SELECT_ANSWER", index });
  };

  const handleConfirmAnswer = async () => {
    if (state.selectedAnswer === null || !state.currentQuestion) return;
    dispatch({ type: "CONFIRM_ANSWER" });

    try {
      await submitAnswer(
        room.id,
        state.currentQuestion.id,
        state.selectedAnswer
      );
    } catch (err) {
      console.error("[Quiz] Failed to submit answer:", err);
    }
  };

  const handleNextQuestion = async () => {
    if (!state.currentQuestion) return;

    try {
      await nextQuestionService(room.id, state.currentQuestion.id);
    } catch (err) {
      console.error("[Quiz] Failed to advance question:", err);
    }
  };

  if (isLoading || !state.currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-6 h-6 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
        {channelError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {channelError}
          </div>
        )}
      </div>
    );
  }

  const q = state.currentQuestion;
  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-fade-border">
        <h3 className="text-text-secondary text-sm font-medium truncate max-w-[200px]">
          {room.title}
        </h3>
        <PointsCounter points={state.userPoints} />
        <div className="flex items-center gap-1.5 text-text-muted">
          <Users className="w-4 h-4" />
          <span className="text-sm">{participants.length}</span>
        </div>
      </div>

      {channelError && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {channelError}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]/60 backdrop-blur-sm p-6 mb-8"
          style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-sm font-bold text-text-secondary">
              {q.question_number}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-white/[0.05] text-text-muted border-white/[0.08]">
              Multiple Choice
            </span>
          </div>
          <p className="text-text-primary text-lg leading-relaxed">
            {q.question_text}
          </p>
        </div>

        <div className="w-full max-w-2xl space-y-3 mb-8">
          {q.options.map((option, i) => {
            const isSelected = state.selectedAnswer === i;
            const isConfirmedSelection = state.confirmedAnswer === i;
            const isCorrectOption = state.answerRevealed && i === q.correct_answer;
            const isWrongOption =
              state.answerRevealed &&
              isConfirmedSelection &&
              i !== q.correct_answer;

            let bgColor = "rgba(255, 255, 255, 0.02)";
            let borderColor = "var(--color-fade-border)";
            let labelBg = "rgba(255, 255, 255, 0.08)";
            let labelColor = "var(--color-text-secondary)";
            let textColor = "var(--color-text-secondary)";
            let shadow = "none";

            if (state.answerRevealed) {
              if (isCorrectOption) {
                bgColor = "rgba(34, 197, 94, 0.12)";
                borderColor = "#22c55e";
                labelBg = "#22c55e";
                labelColor = "#000";
                textColor = "var(--color-text-primary)";
                shadow = "0 0 16px rgba(34, 197, 94, 0.2)";
              } else if (isWrongOption) {
                bgColor = "rgba(239, 68, 68, 0.12)";
                borderColor = "#ef4444";
                labelBg = "#ef4444";
                labelColor = "#fff";
                textColor = "var(--color-text-primary)";
                shadow = "0 0 16px rgba(239, 68, 68, 0.2)";
              } else {
                textColor = "var(--color-text-muted)";
                labelColor = "var(--color-text-muted)";
              }
            } else if (isSelected) {
              bgColor = "rgba(255, 255, 255, 0.04)";
              borderColor = "var(--color-blue-accent)";
              labelColor = "var(--color-blue-accent)";
              textColor = "var(--color-text-primary)";
            }

            return (
              <button
                key={i}
                onClick={() => handleSelectAnswer(i)}
                disabled={state.confirmedAnswer !== null || state.answerRevealed}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all duration-200 text-left ${
                  isSelected && !state.answerRevealed ? "sr-option-select" : ""
                } ${state.answerRevealed ? "sr-fade-in" : ""}`}
                style={{
                  backgroundColor: bgColor,
                  borderColor,
                  boxShadow: shadow,
                  cursor:
                    state.confirmedAnswer !== null || state.answerRevealed
                      ? "default"
                      : "pointer",
                  animationDelay: state.answerRevealed ? `${i * 60}ms` : "0ms",
                }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200"
                  style={{ backgroundColor: labelBg, color: labelColor }}
                >
                  {state.answerRevealed && isCorrectOption
                    ? "✓"
                    : state.answerRevealed && isWrongOption
                    ? "✗"
                    : optionLabels[i]}
                </span>
                <span
                  className="flex-1 text-sm leading-relaxed transition-colors duration-200"
                  style={{ color: textColor }}
                >
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {state.answerRevealed && state.explanation && (
          <div className="w-full max-w-2xl rounded-xl border border-blue-accent/20 bg-blue-accent/5 p-4 mb-6 sr-fade-in">
            <p className="text-text-secondary text-sm leading-relaxed">
              <span className="text-blue-accent font-medium">Explanation: </span>
              {state.explanation}
            </p>
          </div>
        )}

        <div className="w-full max-w-2xl">
          {!state.answerRevealed && (
            <button
              onClick={handleConfirmAnswer}
              disabled={
                state.selectedAnswer === null || state.confirmedAnswer !== null
              }
              className="w-full py-3 rounded-lg bg-blue-accent text-white font-medium text-sm transition-all duration-200 hover:bg-blue-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state.confirmedAnswer !== null ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Waiting for others...
                </span>
              ) : (
                "Confirm Answer"
              )}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-fade-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {participants.map((p) => (
              <ParticipantAvatar
                key={p.id}
                participant={p}
                size="sm"
                showStatus={false}
                showConfirmed
              />
            ))}
          </div>

          {isHost && !state.answerRevealed && (
            <button
              onClick={handleNextQuestion}
              disabled={!allConfirmed}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-accent text-white text-sm font-medium transition-all duration-200 hover:bg-blue-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next Question
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {disconnectedUser && isHost && (
        <DisconnectModal
          participantName={disconnectedUser}
          onContinue={() => setDisconnectedUser(null)}
          onWait={() => setDisconnectedUser(null)}
        />
      )}
    </div>
  );
}
