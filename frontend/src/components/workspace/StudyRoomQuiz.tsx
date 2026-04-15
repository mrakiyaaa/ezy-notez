"use client";

import { useState, useEffect, useReducer, useMemo } from "react";
import { Users, ChevronRight } from "lucide-react";
import type { StudyRoom, Participant, StudyRoomQuestion } from "@/types/studyRoom";
import {
  getCurrentQuestion,
  submitAnswer,
  nextQuestion as nextQuestionService,
  getLobbyParticipants,
} from "@/services/studyRoom.service";
import { supabase } from "@/lib/supabase/client";
import PointsCounter from "./study-room/PointsCounter";
import ParticipantAvatar from "./study-room/ParticipantAvatar";
import DisconnectModal from "./study-room/DisconnectModal";

interface StudyRoomQuizProps {
  room: StudyRoom;
  onRoomEnded: () => void;
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

export default function StudyRoomQuiz({ room, onRoomEnded }: StudyRoomQuizProps) {
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

  const isHost = room.host_id === "current-user";
  const allConfirmed = useMemo(
    () => participants.length > 0 && participants.every((p) => p.has_confirmed),
    [participants]
  );

  // Initial load
  useEffect(() => {
    Promise.all([getCurrentQuestion(room.id), getLobbyParticipants(room.id)])
      .then(([question, parts]) => {
        dispatch({ type: "SET_QUESTION", question });
        setParticipants(parts);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [room.id]);

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase.channel(`study-room:${room.id}`);

    channel
      .on("broadcast", { event: "answer:confirmed" }, (payload) => {
        console.log("[Quiz] answer:confirmed", payload);
        const userId = (payload.payload as { user_id?: string })?.user_id;
        if (userId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === userId ? { ...p, has_confirmed: true } : p
            )
          );
        }
      })
      .on("broadcast", { event: "question:next" }, (payload) => {
        console.log("[Quiz] question:next", payload);
        const data = payload.payload as {
          question?: StudyRoomQuestion;
          correct_answer?: number;
          explanation?: string;
        };

        // First reveal the answer
        if (
          state.currentQuestion &&
          data.correct_answer !== undefined &&
          data.explanation
        ) {
          const pointsEarned =
            state.confirmedAnswer === data.correct_answer ? 100 : 0;
          dispatch({
            type: "REVEAL_ANSWER",
            correctAnswer: data.correct_answer,
            explanation: data.explanation,
            pointsEarned,
          });
        }

        // Then move to next question after a delay
        if (data.question) {
          setTimeout(() => {
            dispatch({ type: "NEXT_QUESTION", question: data.question! });
            setParticipants((prev) =>
              prev.map((p) => ({ ...p, has_confirmed: false }))
            );
          }, 3000);
        }
      })
      .on("broadcast", { event: "participant:disconnected" }, (payload) => {
        console.log("[Quiz] participant:disconnected", payload);
        const name =
          (payload.payload as { name?: string })?.name ?? "A participant";
        if (isHost) {
          setDisconnectedUser(name);
        }
      })
      .on("broadcast", { event: "room:ended" }, (payload) => {
        console.log("[Quiz] room:ended", payload);
        onRoomEnded();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, isHost, onRoomEnded, state.currentQuestion, state.confirmedAnswer]);

  const handleSelectAnswer = (index: number) => {
    dispatch({ type: "SELECT_ANSWER", index });
  };

  const handleConfirmAnswer = async () => {
    if (state.selectedAnswer === null || !state.currentQuestion) return;
    dispatch({ type: "CONFIRM_ANSWER" });

    try {
      const result = await submitAnswer(
        room.id,
        state.currentQuestion.id,
        state.selectedAnswer
      );
      console.log("[Quiz] Answer submitted:", result);
    } catch (err) {
      console.error("[Quiz] Failed to submit answer:", err);
    }
  };

  const handleNextQuestion = async () => {
    if (!state.currentQuestion) return;

    // Reveal answer first
    dispatch({
      type: "REVEAL_ANSWER",
      correctAnswer: state.currentQuestion.correct_answer,
      explanation: state.currentQuestion.explanation,
      pointsEarned:
        state.confirmedAnswer === state.currentQuestion.correct_answer ? 100 : 0,
    });

    try {
      const next = await nextQuestionService(room.id);
      if (next) {
        setTimeout(() => {
          dispatch({ type: "NEXT_QUESTION", question: next });
          setParticipants((prev) =>
            prev.map((p) => ({ ...p, has_confirmed: false }))
          );
          setAllConfirmed(false);
        }, 3000);
      } else {
        // No more questions — end room
        setTimeout(() => onRoomEnded(), 3000);
      }
    } catch (err) {
      console.error("[Quiz] Failed to get next question:", err);
    }
  };

  if (isLoading || !state.currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const q = state.currentQuestion;
  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
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

      {/* Main Quiz Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        {/* Question Card */}
        <div className="w-full max-w-2xl rounded-xl border border-fade-border bg-bg-card/60 backdrop-blur-sm p-6 mb-8"
          style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-sm font-bold text-text-secondary">
              {q.question_number}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-white/[0.05] text-text-muted border border-fade-border">
              Multiple Choice
            </span>
          </div>
          <p className="text-text-primary text-lg leading-relaxed">
            {q.question_text}
          </p>
        </div>

        {/* Options */}
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
                    ? "\u2713"
                    : state.answerRevealed && isWrongOption
                    ? "\u2717"
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

        {/* Explanation (shown after reveal) */}
        {state.answerRevealed && state.explanation && (
          <div className="w-full max-w-2xl rounded-xl border border-blue-accent/20 bg-blue-accent/5 p-4 mb-6 sr-fade-in">
            <p className="text-text-secondary text-sm leading-relaxed">
              <span className="text-blue-accent font-medium">Explanation: </span>
              {state.explanation}
            </p>
          </div>
        )}

        {/* Confirm / Waiting Button */}
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

      {/* Bottom Strip — Participant Status + Host Controls */}
      <div className="border-t border-fade-border px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Participant Confirmations */}
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

          {/* Host: Next Question */}
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

      {/* Disconnect Modal (host only) */}
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
