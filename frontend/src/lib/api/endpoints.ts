export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
  },
  WORKSPACES: {
    LIST: "/workspaces",
    CREATE: "/workspaces",
    GET: (id: string) => `/workspaces/${id}`,
    UPDATE: (id: string) => `/workspaces/${id}`,
    DELETE: (id: string) => `/workspaces/${id}`,
  },
  RESOURCES: {
    LIST: (workspaceId: string) => `/workspaces/${workspaceId}/resources`,
    UPLOAD: (workspaceId: string) => `/workspaces/${workspaceId}/resources/upload`,
    GET: (id: string) => `/resources/${id}`,
    DELETE: (id: string) => `/resources/${id}`,
  },
  AI: {
    SUMMARIZE: "/ai/summarize",
    CHAT: "/ai/chat",
    GENERATE_QUIZ: "/ai/quiz/generate",
    GENERATE_FLASHCARDS: "/ai/flashcards/generate",
  },
  STUDY_ROOM: {
    LIST: "/study-rooms",
    CREATE: "/study-rooms",
    JOIN: (id: string) => `/study-rooms/${id}/join`,
    LEAVE: (id: string) => `/study-rooms/${id}/leave`,
  },
};
