export type InviteMethod = "otp" | "email";
export type RoomStatus = "waiting" | "in_progress" | "completed";
export type InviteStatus = "pending" | "accepted" | "dismissed";
export type ParticipantStatus = "connected" | "disconnected";

// ── Database row types (mirror the Supabase schema exactly) ──────────────────

export interface StudyRoomRow {
  id: string;
  workspace_id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: RoomStatus;
  invite_method: InviteMethod;
  otp_code: string | null;
  otp_expires_at: string | null;
  question_count: number;
  created_at: string;
}

export interface StudyRoomParticipantRow {
  id: string;
  room_id: string;
  user_id: string;
  is_host: boolean;
  joined_at: string;
}

export interface StudyRoomInviteRow {
  id: string;
  room_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  created_at: string;
}

export interface StudyRoomQuestionRow {
  id: string;
  room_id: string;
  question: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  order_index: number;
  created_at: string;
}

export interface StudyRoomAnswerRow {
  id: string;
  room_id: string;
  question_id: string;
  user_id: string;
  selected_answer: string;
  is_correct: boolean;
  points_earned: number;
  answered_at: string;
}

export interface UsedQuestionRow {
  id: string;
  workspace_id: string;
  question_hash: string;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────

export interface StudyRoom {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  question_count: number;
  invite_method: InviteMethod;
  otp_code?: string;
  status: RoomStatus;
  host_id: string;
  host_name: string;
  resource_ids: string[];
  created_at: string;
}

export interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  is_host: boolean;
  status: ParticipantStatus;
  points: number;
  has_confirmed: boolean;
}

export interface StudyRoomQuestion {
  id: string;
  room_id: string;
  question_number: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface ActiveInvitation {
  id: string;
  room_id: string;
  room_title: string;
  host_name: string;
  invite_method: InviteMethod;
  created_at: string;
}

export interface RecentRoom {
  id: string;
  title: string;
  date: string;
  participant_count: number;
  score: number;
  total_questions: number;
  status: RoomStatus;
}

export interface HostedRoom {
  id: string;
  title: string;
  date: string;
  participant_count: number;
  status: RoomStatus;
}

export interface LeaderboardEntry {
  position: number;
  user_id: string;
  name: string;
  avatar_url?: string;
  points: number;
}

export type BadgeType =
  | "first_place"
  | "perfect_score"
  | "first_to_answer"
  | "most_improved"
  | "participation";

export interface Badge {
  type: BadgeType;
  label: string;
  icon: string;
  user_id: string;
}

export interface WrongAnswer {
  question_number: number;
  question_text: string;
  options: string[];
  selected_answer: number;
  correct_answer: number;
  explanation: string;
}

export interface StudyRoomResults {
  room_id: string;
  room_title: string;
  leaderboard: LeaderboardEntry[];
  badges: Badge[];
  wrong_answers: WrongAnswer[];
}

export interface PendingInvite {
  inviteId: string;
  token: string;
  roomId: string;
  roomTitle: string;
  hostName: string;
  workspaceId: string;
  createdAt: string;
}

export interface StudyRoomStats {
  hostedCount: number;
  playedCount: number;
  totalPoints: number;
}

export interface CreateStudyRoomPayload {
  workspace_id: string;
  title: string;
  description?: string;
  question_count: number;
  resource_ids: string[];
  invite_method: InviteMethod;
  emails?: string[];
}
