"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  User,
  SendHorizontal,
  Trash2,
  FileText,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  MessageSquare,
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
// Props
// ---------------------------------------------------------------------------

interface ChattieProps {
  workspaceId: string;
  workspaceName: string;
}

// ---------------------------------------------------------------------------
// Local message type
// ---------------------------------------------------------------------------

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[] | null;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Loading keywords
// ---------------------------------------------------------------------------

const LOADING_KEYWORDS = [
  "Accomplishing","Actioning","Actualizing","Architecting","Baking","Beaming",
  "Beboppin'","Befuddling","Billowing","Blanching","Bloviating","Boogieing",
  "Boondoggling","Booping","Bootstrapping","Brewing","Burrowing","Calculating",
  "Canoodling","Caramelizing","Cascading","Catapulting","Cerebrating",
  "Channelling","Choreographing","Churning","Clauding","Coalescing",
  "Cogitating","Combobulating","Composing","Computing","Concocting",
  "Considering","Contemplating","Cooking","Crafting","Creating",
  "Crystallizing","Cultivating","Crunching","Deciphering","Deliberating",
  "Determining","Dilly-dallying","Discombobulating","Doing","Doodling",
  "Drizzling","Ebbing","Effecting","Elucidating","Embellishing","Enchanting",
  "Envisioning","Evaporating","Fermenting","Fiddle-faddling","Finagling",
  "Flambéing","Flibbertigibbeting","Flowing","Flummoxing","Fluttering",
  "Forging","Forming","Frosting","Frolicking","Gallivanting","Galloping",
  "Garnishing","Generating","Germinating","Gitifying","Grooving","Gusting",
  "Harmonizing","Hashing","Hatching","Herding","Hibernating","Honking",
  "Hullaballooing","Hyperspacing","Ideating","Imagining","Improvising",
  "Incubating","Inferring","Infusing","Ionizing","Jitterbugging","Julienning",
  "Kneading","Leavening","Levitating","Lollygagging","Manifesting",
  "Marinating","Meandering","Metamorphosing","Misting","Moonwalking",
  "Moseying","Mulling","Mustering","Musing","Nebulizing","Nesting","Noodling",
  "Nucleating","Orbiting","Orchestrating","Osmosing","Perambulating",
  "Percolating","Perusing","Philosophising","Photosynthesizing","Pollinating",
  "Pontificating","Pondering","Pouncing","Precipitating","Prestidigitating",
  "Processing","Proofing","Propagating","Puttering","Puzzling","Quantumizing",
  "Razzle-dazzling","Razzmatazzing","Recombobulating","Reticulating",
  "Roosting","Ruminating","Sautéing","Scampering","Scheming","Schlepping",
  "Scurrying","Seasoning","Shenaniganing","Shimmying","Simmering",
  "Skedaddling","Sketching","Slithering","Smooshing","Sock-hopping",
  "Spelunking","Spinning","Sprouting","Stewing","Sublimating","Sussing",
  "Swirling","Swooping","Symbioting","Synthesizing","Tempering","Thinking",
  "Thundering","Tinkering","Tomfoolering","Topsy-turvying","Transfiguring",
  "Transmuting","Twisting","Undulating","Unfurling","Unravelling","Vibing",
  "Waddling","Wandering","Warping","Whatchamacalliting","Whirlpooling",
  "Whirring","Whisking","Wibbling","Working","Wrangling","Zesting",
  "Zigzagging",
];

const suggestionChips = [
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
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function randomKeyword(): string {
  return LOADING_KEYWORDS[Math.floor(Math.random() * LOADING_KEYWORDS.length)];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Chattie({ workspaceId, workspaceName }: ChattieProps) {
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
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [resourcePanelOpen, setResourcePanelOpen] = useState(false);

  // Clear history confirmation
  const [confirmClear, setConfirmClear] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const readyResources = useMemo(
    () => resources.filter((r) => r.status === "ready" && r.extracted_text),
    [resources]
  );

  const selectedCount = selectedResourceIds.size;
  const allSelected = readyResources.length > 0 && selectedCount === readyResources.length;

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // Loading keyword cycler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isTyping) return;
    const interval = setInterval(() => setLoadingKeyword(randomKeyword()), 1500);
    return () => clearInterval(interval);
  }, [isTyping]);

  // ---------------------------------------------------------------------------
  // Load resources
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;
    getWorkspaceResources(workspaceId).then((res) => {
      if (!mounted) return;
      setResources(res);
      const readyIds = res.filter((r) => r.status === "ready" && r.extracted_text).map((r) => r.id);
      setSelectedResourceIds(new Set(readyIds));
    }).catch(() => { if (mounted) setError("Failed to load resources"); });
    return () => { mounted = false; };
  }, [workspaceId]);

  // ---------------------------------------------------------------------------
  // Load sessions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;
    getSessions(workspaceId).then((data) => {
      if (!mounted) return;
      setSessions(data);
      if (data.length > 0) {
        setActiveSession(data[0]);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [workspaceId]);

  // ---------------------------------------------------------------------------
  // Load chat history when active session changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }
    let mounted = true;
    getChatHistory(workspaceId, activeSession.id).then((history) => {
      if (!mounted) return;
      setMessages(history.map((h) => ({
        id: h.id,
        role: h.role,
        content: h.content,
        sources: h.sources,
        timestamp: new Date(h.created_at),
      })));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [workspaceId, activeSession]);

  // ---------------------------------------------------------------------------
  // Session actions
  // ---------------------------------------------------------------------------

  const handleNewChat = useCallback(async () => {
    try {
      const session = await createSession(workspaceId);
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
      setError(null);
      setConfirmClear(false);
    } catch {
      setError("Failed to create new chat");
    }
  }, [workspaceId]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    if (activeSession?.id === session.id) return;
    setActiveSession(session);
    setMessages([]);
    setError(null);
    setConfirmClear(false);
  }, [activeSession]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSession(remaining[0]);
        } else {
          setActiveSession(null);
          setMessages([]);
        }
      }
    } catch {
      setError("Failed to delete session");
    } finally {
      setDeletingSessionId(null);
    }
  }, [activeSession, sessions]);

  // ---------------------------------------------------------------------------
  // Resource selection
  // ---------------------------------------------------------------------------

  const toggleResource = (id: string) => {
    setSelectedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedResourceIds(new Set());
    else setSelectedResourceIds(new Set(readyResources.map((r) => r.id)));
  };

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    // Auto-create session if none exists
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

    const userMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      sources: null,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const isFirstMessage = messages.length === 0;

    try {
      const result = await sendChatMessage(
        workspaceId,
        session.id,
        text,
        Array.from(selectedResourceIds)
      );

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.response,
        sources: result.sources.length > 0 ? result.sources : null,
        timestamp: new Date(),
      }]);

      // Auto-title the session from the first user message
      if (isFirstMessage && session.title === "New Chat") {
        const autoTitle = text.length > 40 ? text.slice(0, 40) + "…" : text;
        updateSessionTitle(session.id, autoTitle).catch(() => {});
        setSessions((prev) =>
          prev.map((s) => s.id === session!.id ? { ...s, title: autoTitle } : s)
        );
        setActiveSession((prev) => prev ? { ...prev, title: autoTitle } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get a response");
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, workspaceId, activeSession, selectedResourceIds, messages.length]);

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
  // Keyboard
  // ---------------------------------------------------------------------------

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const hasInput = input.trim().length > 0;

  // ---------------------------------------------------------------------------
  // Resource name lookup
  // ---------------------------------------------------------------------------

  const resourceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    resources.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [resources]);

  // ---------------------------------------------------------------------------
  // Render: Session sidebar
  // ---------------------------------------------------------------------------

  const renderSidebar = () => (
    <div className="w-56 shrink-0 border-l border-fade-border flex flex-col bg-bg-card/30">
      {/* Sidebar header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-fade-border shrink-0">
        <span className="text-text-primary text-sm font-semibold font-display">Chats</span>
        <button
          onClick={handleNewChat}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-fade-border text-text-muted hover:bg-blue-accent/10 hover:border-blue-accent/30 hover:text-blue-accent transition-colors"
          title="New Chat"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare className="w-6 h-6 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-text-muted text-[11px]">No chats yet</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSession?.id === session.id;
            const isConfirmingDelete = deletingSessionId === session.id;

            return (
              <div
                key={session.id}
                className={`group mx-2 mb-0.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-accent/10 border border-blue-accent/20"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                {isConfirmingDelete ? (
                  <div className="px-2 py-2 flex flex-col gap-1.5">
                    <p className="text-[10px] text-text-muted">Delete this chat?</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="flex-1 text-[10px] text-red-400 border border-red-500/30 rounded px-2 py-0.5 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingSessionId(null)}
                        className="flex-1 text-[10px] text-text-muted border border-fade-border rounded px-2 py-0.5 hover:bg-white/[0.04] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectSession(session)}
                    className="w-full px-2.5 py-2 text-left flex items-start justify-between gap-1 min-w-0"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-xs truncate font-medium leading-tight ${
                        isActive ? "text-text-primary" : "text-text-secondary"
                      }`}>
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
                      className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-red-400 transition-all mt-0.5"
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
  // Render: Resource selector panel
  // ---------------------------------------------------------------------------

  const renderResourceSelector = () => (
    <div className="border-b border-fade-border bg-bg-card/50">
      <button
        onClick={() => setResourcePanelOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          <span className="font-medium">
            Resources ({selectedCount}/{readyResources.length} selected)
          </span>
        </div>
        {resourcePanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {resourcePanelOpen && (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-[11px] text-text-muted hover:text-text-primary transition-colors py-1"
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-accent" /> : <Square className="w-3.5 h-3.5" />}
            <span>{allSelected ? "Deselect All" : "Select All"}</span>
          </button>
          <div className="max-h-32 overflow-y-auto flex flex-col gap-0.5">
            {readyResources.map((r) => {
              const checked = selectedResourceIds.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleResource(r.id)}
                  className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-white/[0.04] transition-colors text-left"
                >
                  {checked
                    ? <CheckSquare className="w-3.5 h-3.5 text-blue-accent shrink-0" />
                    : <Square className="w-3.5 h-3.5 text-text-muted shrink-0" />}
                  <span className={`truncate ${checked ? "text-text-primary" : "text-text-muted"}`}>
                    {r.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Source pills
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
        {unique.map((source, i) => (
          <div
            key={`${source.resource_id}-${i}`}
            className="bg-blue-accent/10 border border-blue-accent/20 text-blue-accent text-[10px] rounded px-2 py-0.5 flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            {resourceNameMap.get(source.resource_id) ?? "Resource"}
          </div>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Input bar
  // ---------------------------------------------------------------------------

  const renderInputBar = (centered?: boolean) => (
    <div className={centered ? "w-full max-w-xl mx-auto" : "max-w-3xl mx-auto"}>
      <div className="bg-bg-card border border-fade-border rounded-xl px-3 py-2.5 flex items-end gap-2 focus-within:border-blue-accent/30 transition-colors shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask Chatie anything..."
          rows={1}
          className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none resize-none max-h-32 mb-1.5"
        />
        <button
          onClick={handleSend}
          disabled={!hasInput || isTyping}
          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors mb-0.5 ${
            hasInput && !isTyping
              ? "bg-blue-accent text-white"
              : "bg-white/4 text-text-muted cursor-not-allowed"
          }`}
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>
      <p className="text-text-muted text-[11px] text-center mt-2.5">
        Chatie can make mistakes. Consider verifying important information.
      </p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-main min-w-0">
        {/* Topbar */}
        <div className="h-14 px-6 border-b border-fade-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-blue-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-text-primary font-semibold font-display text-sm leading-tight">
                {activeSession?.title ?? "Chatie"}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-text-muted text-[11px]">
                  Trained on {workspaceName} &middot; {readyResources.length} resource{readyResources.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-[11px]">Clear history?</span>
                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-[11px] text-text-muted hover:text-text-primary px-2 py-1 rounded border border-fade-border hover:bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-fade-border text-text-muted hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Resource selector */}
        {renderResourceSelector()}

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-xs flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center min-h-full text-center p-6">
              <div className="relative w-18 h-18 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center mb-6">
                <div className="absolute -inset-1.75 border border-blue-accent rounded-full opacity-10" />
                <div className="absolute -inset-3.5 border border-blue-accent rounded-full opacity-5" />
                <MessageCircle className="w-8 h-8 text-blue-accent" />
              </div>
              <h2 className="text-text-primary text-xl font-bold font-display mb-2">
                Hey there! I&apos;m Chatie
              </h2>
              <p className="text-text-muted text-sm max-w-sm font-light mb-8 leading-relaxed">
                Ask me anything about your uploaded resources in{" "}
                <strong className="font-semibold text-text-primary">{workspaceName}</strong>.
                I&apos;m here to help you study!
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => { setInput(chip); textareaRef.current?.focus(); }}
                    className="border border-fade-border bg-bg-card text-text-secondary text-xs rounded-full px-4 py-2 cursor-pointer transition-all duration-200 hover:border-blue-accent/30 hover:bg-blue-accent/10 hover:text-text-primary"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {renderInputBar(true)}
            </div>
          ) : (
            <div className="max-w-3xl w-full mx-auto px-6 py-6 flex flex-col gap-6">
              {messages.map((msg) =>
                msg.role === "assistant" ? (
                  <div key={msg.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-blue-accent" />
                    </div>
                    <div className="flex flex-col gap-1 items-start max-w-[85%]">
                      <div className="bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="text-text-secondary text-sm leading-relaxed prose-sm">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="text-text-secondary text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="flex flex-col gap-1 mb-2 last:mb-0">{children}</ul>,
                              ol: ({ children }) => <ol className="flex flex-col gap-1 mb-2 last:mb-0 list-decimal list-inside">{children}</ol>,
                              li: ({ children }) => <li className="text-text-secondary text-sm leading-relaxed">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
                              em: ({ children }) => <em className="text-text-secondary italic">{children}</em>,
                              code: ({ children }) => <code className="bg-white/5 text-text-primary text-xs px-1.5 py-0.5 rounded">{children}</code>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      {msg.sources && msg.sources.length > 0 && renderSources(msg.sources)}
                      <span className="text-text-muted text-[10px] ml-1 mt-0.5">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-blue-accent flex items-center justify-center shrink-0">
                      <User className="text-white w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-1 items-end max-w-[85%]">
                      <div className="bg-blue-accent/10 border border-blue-accent/30 rounded-2xl rounded-tr-sm px-4 py-3">
                        <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-text-muted text-[10px] mr-1 mt-0.5">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                )
              )}

              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-blue-accent" />
                  </div>
                  <div className="flex items-center bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-4 w-fit gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-text-muted text-xs font-medium ml-1.5 min-w-[140px]">
                      {loadingKeyword}...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* Fixed bottom input bar */}
        {(messages.length > 0 || isTyping) && (
          <div className="shrink-0 bg-main border-t border-fade-border px-6 py-3">
            {renderInputBar()}
          </div>
        )}
      </div>

      {/* Sessions Sidebar */}
      {renderSidebar()}
    </div>
  );
}
