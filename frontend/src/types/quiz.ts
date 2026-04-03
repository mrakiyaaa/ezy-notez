// Quiz question types
export type QuestionType = "mcq" | "scenario" | "mixed";

// Quiz status during generation
export type QuizStatus = "pending" | "processing" | "ready" | "failed";

// Attempt status
export type AttemptStatus = "in_progress" | "completed";

// Individual question option
export interface QuestionOption {
  id: string;
  label: string; // A, B, C, D
  text: string;
}

// Individual quiz question
export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "mcq" | "scenario";
  options: QuestionOption[];
  correct_option_id: string;
  explanation: string;
  topic_tag: string;
  position: number;
}

// Quiz metadata (without questions)
export interface Quiz {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  source_ids: string[];
  question_type: QuestionType;
  question_count: number;
  status: QuizStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Quiz with full question data
export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

// Answer record within an attempt
export interface QuizAnswer {
  question_id: string;
  selected_option_id: string;
  is_correct: boolean;
  answered_at: string;
}

// Quiz attempt
export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  status: AttemptStatus;
  answers: QuizAnswer[];
  score: number | null;
  started_at: string;
  completed_at: string | null;
}

// Combined quiz with attempt data for listing
export interface QuizWithAttempt extends Quiz {
  attempt: QuizAttempt | null;
}

// Generation request payload
export interface GenerateQuizRequest {
  workspace_id: string;
  resource_ids: string[];
  question_type: QuestionType;
  question_count: number;
}

// Submit answer request
export interface SubmitAnswerRequest {
  question_id: string;
  selected_option_id: string;
}

// Attempt results with full breakdown
export interface AttemptResults {
  attempt: QuizAttempt;
  quiz: Quiz;
  questions: QuizQuestion[];
  topic_breakdown: TopicBreakdown[];
}

// Topic weakness breakdown
export interface TopicBreakdown {
  topic_tag: string;
  total_questions: number;
  correct_answers: number;
  accuracy_percentage: number;
}
