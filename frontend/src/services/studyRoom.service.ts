import type {
  CreateStudyRoomPayload,
  StudyRoom,
  ActiveInvitation,
  RecentRoom,
  HostedRoom,
  Participant,
  StudyRoomQuestion,
  StudyRoomResults,
} from "@/types/studyRoom";

/**
 * Create a new study room.
 * Returns the created room with OTP code if applicable.
 */
export async function createStudyRoom(
  payload: CreateStudyRoomPayload
): Promise<StudyRoom> {
  console.log("[StudyRoom] createStudyRoom called with:", payload);

  // Mock response
  return {
    id: `room-${Date.now()}`,
    workspace_id: payload.workspace_id,
    title: payload.title,
    description: payload.description,
    question_count: payload.question_count,
    invite_method: payload.invite_method,
    otp_code: payload.invite_method === "otp" ? "482916" : undefined,
    status: "waiting",
    host_id: "current-user",
    host_name: "You",
    resource_ids: payload.resource_ids,
    created_at: new Date().toISOString(),
  };
}

/**
 * Join a room using an OTP code.
 */
export async function joinRoomWithOtp(
  roomId: string,
  otp: string
): Promise<{ success: boolean; room: StudyRoom }> {
  console.log("[StudyRoom] joinRoomWithOtp called:", { roomId, otp });

  return {
    success: true,
    room: {
      id: roomId,
      workspace_id: "ws-1",
      title: "Mock Study Room",
      question_count: 20,
      invite_method: "otp",
      otp_code: otp,
      status: "waiting",
      host_id: "host-user",
      host_name: "Host",
      resource_ids: [],
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Start the room quiz (host only).
 */
export async function startRoom(roomId: string): Promise<void> {
  console.log("[StudyRoom] startRoom called:", roomId);
}

/**
 * Submit an answer for the current question.
 */
export async function submitAnswer(
  roomId: string,
  questionId: string,
  answer: number
): Promise<{ correct: boolean; points: number }> {
  console.log("[StudyRoom] submitAnswer called:", { roomId, questionId, answer });

  return {
    correct: answer === 2,
    points: answer === 2 ? 100 : 0,
  };
}

/**
 * Move to next question (host only).
 */
export async function nextQuestion(
  roomId: string
): Promise<StudyRoomQuestion | null> {
  console.log("[StudyRoom] nextQuestion called:", roomId);

  return {
    id: `q-${Date.now()}`,
    room_id: roomId,
    question_number: 2,
    question_text: "What is the primary purpose of an operating system?",
    options: [
      "To provide entertainment",
      "To manage hardware and software resources",
      "To connect to the internet",
      "To create documents",
    ],
    correct_answer: 1,
    explanation:
      "An operating system manages hardware and software resources, providing common services for computer programs.",
  };
}

/**
 * Get results for a completed room.
 */
export async function getResults(roomId: string): Promise<StudyRoomResults> {
  console.log("[StudyRoom] getResults called:", roomId);

  return {
    room_id: roomId,
    room_title: "Data Structures & Algorithms",
    leaderboard: [
      { position: 1, user_id: "u1", name: "Alice", points: 1800 },
      { position: 2, user_id: "u2", name: "Bob", points: 1500 },
      { position: 3, user_id: "u3", name: "Charlie", points: 1200 },
      { position: 4, user_id: "current-user", name: "You", points: 1100 },
    ],
    badges: [
      { type: "first_place", label: "First Place", icon: "\uD83E\uDD47", user_id: "u1" },
      { type: "perfect_score", label: "Perfect Score", icon: "\uD83D\uDD25", user_id: "u1" },
      { type: "first_to_answer", label: "First to Answer", icon: "\u26A1", user_id: "u2" },
      { type: "most_improved", label: "Most Improved", icon: "\uD83D\uDCDA", user_id: "u3" },
      { type: "participation", label: "Participation", icon: "\uD83D\uDC80", user_id: "current-user" },
    ],
    wrong_answers: [
      {
        question_number: 3,
        question_text: "Which data structure uses LIFO ordering?",
        options: ["Queue", "Array", "Stack", "Linked List"],
        selected_answer: 0,
        correct_answer: 2,
        explanation:
          "A Stack uses Last-In-First-Out (LIFO) ordering, where the last element added is the first one removed.",
      },
      {
        question_number: 7,
        question_text: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        selected_answer: 0,
        correct_answer: 1,
        explanation:
          "Binary search has O(log n) time complexity as it halves the search space with each comparison.",
      },
    ],
  };
}

/**
 * Get AI-generated insights for a completed room.
 */
export async function getInsights(
  roomId: string
): Promise<{ insights: string }> {
  console.log("[StudyRoom] getInsights called:", roomId);

  return {
    insights: "Generating insights...",
  };
}

/**
 * Fetch active invitations for the current user in this workspace.
 */
export async function getActiveInvitations(
  workspaceId: string
): Promise<ActiveInvitation[]> {
  console.log("[StudyRoom] getActiveInvitations called:", workspaceId);
  return [];
}

/**
 * Fetch recent rooms the user participated in.
 */
export async function getRecentRooms(
  workspaceId: string
): Promise<RecentRoom[]> {
  console.log("[StudyRoom] getRecentRooms called:", workspaceId);
  return [];
}

/**
 * Fetch rooms hosted by the current user.
 */
export async function getHostedRooms(
  workspaceId: string
): Promise<HostedRoom[]> {
  console.log("[StudyRoom] getHostedRooms called:", workspaceId);
  return [];
}

/**
 * Fetch lobby participants for a room.
 */
export async function getLobbyParticipants(
  roomId: string
): Promise<Participant[]> {
  console.log("[StudyRoom] getLobbyParticipants called:", roomId);

  return [
    {
      id: "p1",
      user_id: "current-user",
      name: "You",
      is_host: true,
      status: "connected",
      points: 0,
      has_confirmed: false,
    },
  ];
}

/**
 * Fetch the current question for a live quiz.
 */
export async function getCurrentQuestion(
  roomId: string
): Promise<StudyRoomQuestion> {
  console.log("[StudyRoom] getCurrentQuestion called:", roomId);

  return {
    id: "q-1",
    room_id: roomId,
    question_number: 1,
    question_text:
      "Which sorting algorithm has the best average-case time complexity?",
    options: ["Bubble Sort", "Selection Sort", "Merge Sort", "Insertion Sort"],
    correct_answer: 2,
    explanation:
      "Merge Sort has O(n log n) average-case time complexity, which is optimal among comparison-based sorting algorithms.",
  };
}
