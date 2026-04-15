"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  SendHorizontal,
  Trash2,
  FileText,
  CheckSquare,
  Square,
  ChevronUp,
  AlertTriangle,
  Plus,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getWorkspaceResources } from "@/services/resource.service";
import {
  getSessions,
  createSession,
  updateSessionTitle,
  deleteSession,
  sendChatMessage,
  getChatHistory,
  deleteChatHistory,
} from "@/services/chatie.service";
import type { Resource } from "@/types/resource";
import type { ChatSource, ChatSession } from "@/types/chatie";

// ---------------------------------------------------------------------------
// Props & types
// ---------------------------------------------------------------------------

interface ChattieProps {
  workspaceId: string;
  workspaceName: string;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[] | null;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOADING_KEYWORDS = [
  "Accomplishing","Actioning","Architecting","Baking","Beaming","Bootstrapping",
  "Brewing","Calculating","Cascading","Cerebrating","Churning","Clauding",
  "Cogitating","Composing","Computing","Concocting","Contemplating","Cooking",
  "Crafting","Creating","Crunching","Deciphering","Deliberating","Determining",
  "Elucidating","Enchanting","Envisioning","Fermenting","Forging","Generating",
  "Harmonizing","Hatching","Ideating","Imagining","Incubating","Inferring",
  "Manifesting","Mulling","Musing","Orchestrating","Percolating","Pondering",
  "Processing","Puzzling","Reasoning","Simmering","Synthesizing","Thinking",
  "Weaving","Working",
];

const SUGGESTION_CHIPS = [
  "Summarize my notes",
  "Explain key concepts",
  "Help me revise",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function randomKeyword(): string {
  return LOADING_KEYWORDS[Math.floor(Math.random() * LOADING_KEYWORDS.length)];
}

// ---------------------------------------------------------------------------
// Chattie Avatar (SVG face + float + wave)
// ---------------------------------------------------------------------------

function ChattieAvatar({ size = 72 }: { size?: number }) {
  return (
    <div className="relative animate-[float_3s_ease-in-out_infinite]">
      {/* Aura rings */}
      <div
        className="absolute rounded-full border border-blue-accent/10"
        style={{ inset: -6 }}
      />
      <div
        className="absolute rounded-full border border-blue-accent/5"
        style={{ inset: -14 }}
      />

      {/* Main circle */}
      <div
        className="rounded-full bg-blue-accent/10 border-2 border-blue-accent/30 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 40 40"
          className="text-blue-accent"
          style={{ width: size * 0.6, height: size * 0.6 }}
        >
          {/* Left eye */}
          <circle cx="13" cy="15" r="2.5" fill="currentColor" />
          {/* Right eye */}
          <circle cx="27" cy="15" r="2.5" fill="currentColor" />
          {/* Smile */}
          <path
            d="M13 25 Q20 32 27 25"
            stroke="currentColor"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Waving hand */}
      <span
        className="absolute -bottom-1 -right-1 text-lg animate-[wave_1.5s_ease-in-out_infinite] origin-bottom-right"
      >
        👋
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Chattie({ workspaceId, workspaceName }: ChattieProps) {
  // Messages
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingKeyword, setLoadingKeyword] = useState(randomKeyword);
  const [error, setError] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(
    new Set()
  );
  const [resourcePanelOpen, setResourcePanelOpen] = useState(false);

  // Clear confirm
  const [confirmClear, setConfirmClear] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resourceDropdownRef = useRef<HTMLDivElement>(null);

  // Derived
  const readyResources = useMemo(
    () => resources.filter((r) => r.status === "ready" && r.extracted_text),
    [resources]
  );
  const selectedCount = selectedResourceIds.size;
  const allSelected =
    readyResources.length > 0 && selectedCount === readyResources.length;
  const hasInput = input.trim().length > 0;
  const hasMessages = messages.length > 0 || isTyping;

  const resourceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    resources.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [resources]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (!isTyping) return;
    const iv = setInterval(() => setLoadingKeyword(randomKeyword()), 1500);
    return () => clearInterval(iv);
  }, [isTyping]);

  // Load resources
  useEffect(() => {
    let ok = true;
    getWorkspaceResources(workspaceId)
      .then((res) => {
        if (!ok) return;
        setResources(res);
        setSelectedResourceIds(
          new Set(
            res
              .filter((r) => r.status === "ready" && r.extracted_text)
              .map((r) => r.id)
          )
        );
      })
      .catch(() => ok && setError("Failed to load resources"));
    return () => {
      ok = false;
    };
  }, [workspaceId]);

  // Load sessions
  useEffect(() => {
    let ok = true;
    getSessions(workspaceId)
      .then((data) => {
        if (!ok) return;
        setSessions(data);
        if (data.length > 0) setActiveSession(data[0]);
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, [workspaceId]);

  // Load history for active session
  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }
    let ok = true;
    getChatHistory(workspaceId, activeSession.id)
      .then((h) => {
        if (!ok) return;
        setMessages(
          h.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources,
            timestamp: new Date(m.created_at),
          }))
        );
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, [workspaceId, activeSession]);

  // Close resource dropdown on outside click
  useEffect(() => {
    if (!resourcePanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        resourceDropdownRef.current &&
        !resourceDropdownRef.current.contains(e.target as Node)
      ) {
        setResourcePanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [resourcePanelOpen]);

  // ---------------------------------------------------------------------------
  // Session actions
  // ---------------------------------------------------------------------------

  const handleNewChat = useCallback(async () => {
    try {
      const s = await createSession(workspaceId);
      setSessions((prev) => [s, ...prev]);
      setActiveSession(s);
      setMessages([]);
      setError(null);
      setConfirmClear(false);
    } catch {
      setError("Failed to create new chat");
    }
  }, [workspaceId]);

  const handleSelectSession = useCallback(
    (s: ChatSession) => {
      if (activeSession?.id === s.id) return;
      setActiveSession(s);
      setMessages([]);
      setError(null);
      setConfirmClear(false);
    },
    [activeSession]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeSession?.id === id) {
          const rest = sessions.filter((s) => s.id !== id);
          setActiveSession(rest.length > 0 ? rest[0] : null);
          if (rest.length === 0) setMessages([]);
        }
      } catch {
        setError("Failed to delete session");
      } finally {
        setDeletingSessionId(null);
      }
    },
    [activeSession, sessions]
  );

  // ---------------------------------------------------------------------------
  // Resource selection
  // ---------------------------------------------------------------------------

  const toggleResource = (id: string) =>
    setSelectedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const toggleAll = () =>
    setSelectedResourceIds(
      allSelected ? new Set() : new Set(readyResources.map((r) => r.id))
    );

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    let session = activeSession;
    if (!session) {
      try {
        session = await createSession(workspaceId);
        setSessions((prev) => [session!, ...prev]);
        setActiveSession(session);
      } catch {
        setError("Failed to start chat session");
        return;
      }
    }

    setError(null);
    setConfirmClear(false);
    setResourcePanelOpen(false);

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      sources: null,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const isFirst = messages.length === 0;

    try {
      const result = await sendChatMessage(
        workspaceId,
        session.id,
        text,
        Array.from(selectedResourceIds)
      );

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.response,
          sources: result.sources.length > 0 ? result.sources : null,
          timestamp: new Date(),
        },
      ]);

      if (isFirst && session.title === "New Chat") {
        const t = text.length > 40 ? text.slice(0, 40) + "…" : text;
        updateSessionTitle(session.id, t).catch(() => {});
        setSessions((prev) =>
          prev.map((s) => (s.id === session!.id ? { ...s, title: t } : s))
        );
        setActiveSession((prev) => (prev ? { ...prev, title: t } : prev));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get a response"
      );
    } finally {
      setIsTyping(false);
    }
  }, [
    input,
    isTyping,
    workspaceId,
    activeSession,
    selectedResourceIds,
    messages.length,
  ]);

  // ---------------------------------------------------------------------------
  // Clear history
  // ---------------------------------------------------------------------------

  const handleClearHistory = useCallback(async () => {
    if (!activeSession) return;
    try {
      await deleteChatHistory(workspaceId, activeSession.id);
      setMessages([]);
      setConfirmClear(false);
      setError(null);
    } catch {
      setError("Failed to clear chat history");
    }
  }, [workspaceId, activeSession]);

  // ---------------------------------------------------------------------------
  // Keyboard / textarea
  // ---------------------------------------------------------------------------

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // ---------------------------------------------------------------------------
  // Sub-renders
  // ---------------------------------------------------------------------------

  const renderSources = (sources: ChatSource[]) => {
    const seen = new Set<string>();
    const unique = sources.filter((s) => {
      if (seen.has(s.resource_id)) return false;
      seen.add(s.resource_id);
      return true;
    });
    return (
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {unique.map((s, i) => (
          <div
            key={`${s.resource_id}-${i}`}
            className="bg-blue-accent/10 border border-blue-accent/20 text-blue-accent text-[10px] rounded px-2 py-0.5 flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            {resourceNameMap.get(s.resource_id) ?? "Resource"}
          </div>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Input bar (Grok-style pill with inline resource selector)
  // ---------------------------------------------------------------------------

  const renderInputBar = () => (
    <div className="relative w-full max-w-2xl mx-auto" ref={resourceDropdownRef}>
      {/* Resource dropdown (opens upward) */}
      {resourcePanelOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-bg-card border border-fade-border rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-fade-border">
            <span className="text-text-primary text-xs font-semibold">
              Select resources
            </span>
            <button
              onClick={toggleAll}
              className="text-blue-accent text-[11px] font-medium hover:underline"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto p-1.5">
            {readyResources.length === 0 ? (
              <p className="text-text-muted text-xs px-3 py-4 text-center">
                No resources available
              </p>
            ) : (
              readyResources.map((r) => {
                const checked = selectedResourceIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleResource(r.id)}
                    className="w-full flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-blue-accent shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <span
                      className={`truncate ${checked ? "text-text-primary" : "text-text-muted"}`}
                    >
                      {r.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Input pill */}
      <div className="bg-bg-card border border-fade-border rounded-3xl px-4 py-2 flex items-end gap-2 focus-within:border-blue-accent/30 transition-colors shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Chattie anything..."
          rows={1}
          className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none resize-none max-h-30 py-1.5"
        />

        {/* Resource selector button */}
        <button
          onClick={() => setResourcePanelOpen((v) => !v)}
          className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5 transition-colors border mb-0.5 ${
            resourcePanelOpen
              ? "bg-blue-accent/10 border-blue-accent/30 text-blue-accent"
              : "bg-white/5 border-fade-border text-text-muted hover:text-text-secondary hover:border-blue-accent/20"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span>
            {selectedCount}/{readyResources.length}
          </span>
          <ChevronUp
            className={`w-3 h-3 transition-transform ${resourcePanelOpen ? "" : "rotate-180"}`}
          />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!hasInput || isTyping}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors mb-0.5 ${
            hasInput && !isTyping
              ? "bg-blue-accent text-white"
              : "bg-white/5 text-text-muted cursor-not-allowed"
          }`}
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>

      <p className="text-text-muted text-[10px] text-center mt-2 opacity-60">
        Chattie can make mistakes. Consider verifying important information.
      </p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Right sidebar — chat sessions
  // ---------------------------------------------------------------------------

  const renderSidebar = () => (
    <div className="w-[260px] shrink-0 border-l border-fade-border flex flex-col bg-bg-card/30">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-fade-border shrink-0">
        <span className="text-text-primary text-sm font-semibold font-display">
          Chats
        </span>
        <button
          onClick={handleNewChat}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-fade-border text-text-muted hover:bg-blue-accent/10 hover:border-blue-accent/30 hover:text-blue-accent transition-colors"
          title="New Chat"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted text-xs">No chats yet</p>
            <p className="text-text-muted/60 text-[10px] mt-1">
              Start a conversation below
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSession?.id === session.id;
            const isDeleting = deletingSessionId === session.id;

            return (
              <div
                key={session.id}
                className={`group mb-0.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-accent/10 border border-blue-accent/20"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                {isDeleting ? (
                  <div className="px-3 py-2.5 flex flex-col gap-2">
                    <p className="text-text-muted text-[11px]">
                      Delete this chat?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="flex-1 text-[11px] text-red-400 border border-red-500/30 rounded-md px-2 py-1 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingSessionId(null)}
                        className="flex-1 text-[11px] text-text-muted border border-fade-border rounded-md px-2 py-1 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectSession(session)}
                    className="w-full px-3 py-2.5 text-left flex items-start justify-between gap-2 min-w-0"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs truncate font-medium leading-tight ${
                          isActive
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {session.title}
                      </span>
                      <span className="text-[10px] text-text-muted mt-0.5">
                        {formatSessionDate(session.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingSessionId(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>

      <div className="flex h-full overflow-hidden">
        {/* ── Main chat area ── */}
        <div className="flex-1 flex flex-col bg-main min-w-0">
          {/* Topbar (only when messages exist) */}
          {hasMessages && (
            <div className="h-12 px-6 border-b border-fade-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-accent" />
                </div>
                <span className="text-text-primary text-sm font-semibold font-display truncate">
                  {activeSession?.title ?? "Chattie"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {confirmClear ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted text-[11px]">
                      Clear history?
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[11px] text-red-400 font-medium px-2 py-1 rounded-md border border-red-500/30 hover:bg-red-500/10 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-[11px] text-text-muted px-2 py-1 rounded-md border border-fade-border hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-fade-border text-text-muted hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mx-6 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400/60 hover:text-red-400 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center min-h-full text-center px-6 pb-6">
                <div className="mb-8">
                  <ChattieAvatar />
                </div>

                <h2 className="text-text-primary text-2xl font-bold font-display mb-2">
                  Hey there! I&apos;m Chattie
                </h2>
                <p className="text-text-muted text-sm max-w-md font-light mb-8 leading-relaxed">
                  Ask me anything about your uploaded resources in{" "}
                  <strong className="font-semibold text-text-primary">
                    {workspaceName}
                  </strong>
                  . I&apos;m here to help you study!
                </p>

                <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setInput(chip);
                        textareaRef.current?.focus();
                      }}
                      className="border border-fade-border bg-bg-card text-text-secondary text-xs rounded-full px-5 py-2.5 cursor-pointer transition-all duration-200 hover:border-blue-accent/30 hover:bg-blue-accent/10 hover:text-text-primary"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {renderInputBar()}
              </div>
            ) : (
              /* ── Message thread ── */
              <div className="max-w-3xl w-full mx-auto px-6 py-6 flex flex-col gap-6">
                {messages.map((msg) =>
                  msg.role === "assistant" ? (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                        <svg
                          viewBox="0 0 40 40"
                          className="text-blue-accent w-5 h-5"
                        >
                          <circle cx="13" cy="15" r="2.5" fill="currentColor" />
                          <circle cx="27" cy="15" r="2.5" fill="currentColor" />
                          <path
                            d="M13 25 Q20 32 27 25"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-1 items-start max-w-[85%]">
                        <div className="bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="text-text-secondary text-sm leading-relaxed">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="text-text-secondary text-sm leading-relaxed mb-2 last:mb-0">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="flex flex-col gap-1 mb-2 last:mb-0">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="flex flex-col gap-1 mb-2 last:mb-0 list-decimal list-inside">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="text-text-secondary text-sm leading-relaxed">
                                    {children}
                                  </li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-text-primary">
                                    {children}
                                  </strong>
                                ),
                                em: ({ children }) => (
                                  <em className="text-text-secondary italic">
                                    {children}
                                  </em>
                                ),
                                code: ({ children }) => (
                                  <code className="bg-white/5 text-text-primary text-xs px-1.5 py-0.5 rounded">
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {msg.sources &&
                          msg.sources.length > 0 &&
                          renderSources(msg.sources)}
                        <span className="text-text-muted text-[10px] ml-1 mt-0.5">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-blue-accent flex items-center justify-center shrink-0">
                        <User className="text-white w-4 h-4" />
                      </div>
                      <div className="flex flex-col gap-1 items-end max-w-[85%]">
                        <div className="bg-blue-accent/10 border border-blue-accent/30 rounded-2xl rounded-tr-sm px-4 py-3">
                          <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                        <span className="text-text-muted text-[10px] mr-1 mt-0.5">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  )
                )}

                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 40 40"
                        className="text-blue-accent w-5 h-5"
                      >
                        <circle cx="13" cy="15" r="2.5" fill="currentColor" />
                        <circle cx="27" cy="15" r="2.5" fill="currentColor" />
                        <path
                          d="M13 25 Q20 32 27 25"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="flex items-center bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-3.5 w-fit gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-text-muted text-xs font-medium ml-1">
                        {loadingKeyword}...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </div>

          {/* Fixed bottom input bar (only when messages exist) */}
          {hasMessages && (
            <div className="shrink-0 bg-main border-t border-fade-border px-6 py-3">
              {renderInputBar()}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        {renderSidebar()}
      </div>
    </>
  );
}
