"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  User,
  SendHorizontal,
  Paperclip,
  Plus,
  Search,
  Trash2,
  FileText
} from "lucide-react";

interface ChattieProps {
  workspaceId: string;
  workspaceName: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const mockReplies = [
  "That's a great question! Based on your uploaded notes, here's what I found...",
  "Let me look through your resources... I found some relevant information about that topic.",
  "From your lecture materials, I can see that this concept is explained in detail. Here's a summary...",
  "I'd recommend reviewing Chapter 3 of your uploaded PDF for more details on this. Here's the key takeaway...",
  "Great question! Your notes mention several key points about this. Let me break them down for you...",
];

const suggestionChips = [
  "Summarize my notes",
  "Explain key concepts",
  "Help me revise",
];

const mockHistory = [
  { group: "Today", items: [{ id: "1", title: "Lecture 4 Notes", time: "10:30 AM", count: 12 }, { id: "2", title: "Assignment 2 Ideas", time: "09:15 AM", count: 4 }] },
  { group: "Yesterday", items: [{ id: "3", title: "Midterm Prep", time: "04:20 PM", count: 34 }] },
  { group: "Earlier", items: [{ id: "4", title: "Course Syllabus", time: "Monday", count: 2 }] },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chattie({
  workspaceName,
}: ChattieProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: mockReplies[Math.floor(Math.random() * mockReplies.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 1500);
  }, [input]);

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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Col 2 - History Panel */}
      <div className="w-64 bg-main border-r border-fade-border shrink-0 flex flex-col">
        <div className="p-4 border-b border-fade-border flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1">
            <MessageCircle className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted text-[10px] font-semibold uppercase tracking-widest font-display">
              Chatie
            </span>
          </div>
          <button className="w-full bg-blue-accent text-white text-xs font-semibold font-display rounded-lg py-2 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full bg-main border border-fade-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-accent/30 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {mockHistory.map((group) => (
            <div key={group.group} className="mb-4 last:mb-0">
              <div className="text-text-muted text-[10px] uppercase tracking-widest font-display px-2 pt-3 pb-1">
                {group.group}
              </div>
              <div className="flex flex-col gap-1">
                {group.items.map((item, idx) => {
                  const isActive = idx === 0 && group.group === "Today";
                  return (
                    <div
                      key={item.id}
                      className={`group/item flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        isActive
                          ? "bg-blue-accent/10 border border-blue-accent/30"
                          : "text-text-muted hover:bg-white/4 border border-transparent"
                      }`}
                    >
                      <div className="w-6.5 h-6.5 bg-bg-card border border-fade-border rounded-md flex items-center justify-center shrink-0">
                        <MessageCircle className={`w-3.5 h-3.5 ${isActive ? "text-blue-accent" : ""}`} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-xs truncate ${isActive ? "text-text-primary" : ""}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {item.time} · {item.count} msgs
                        </span>
                      </div>
                      <button className="hidden group-hover/item:flex w-6 h-6 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-400 text-text-muted transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Col 3 - Main Chat Area */}
      <div className="flex-1 flex flex-col bg-main min-w-0">
        {/* Topbar */}
        <div className="h-14 px-6 border-b border-fade-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-blue-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-text-primary font-semibold font-display text-sm leading-tight">
                Chatie
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-text-muted text-[11px]">
                  Trained on {workspaceName} · 4 resources
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-md border border-fade-border text-text-muted hover:bg-blue-accent/10 hover:border-blue-accent/30 hover:text-blue-accent transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md border border-fade-border text-text-muted hover:bg-blue-accent/10 hover:border-blue-accent/30 hover:text-blue-accent transition-colors">
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 && !isTyping ? (
            /* Empty state & Input bar centered */
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
              <div className="relative w-18 h-18 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center mb-6">
                <div className="absolute -inset-1.75 border border-blue-accent rounded-full opacity-10" />
                <div className="absolute -inset-3.5 border border-blue-accent rounded-full opacity-5" />
                <MessageCircle className="w-8 h-8 text-blue-accent" />
              </div>
              
              <h2 className="text-text-primary text-xl font-bold font-display mb-2">
                Hey there! I&apos;m Chatie 👋
              </h2>
              <p className="text-text-muted text-sm max-w-sm font-light mb-8 leading-relaxed">
                Ask me anything about your uploaded resources in <strong className="font-semibold text-text-primary">{workspaceName}</strong>. I&apos;m here to help you study!
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setInput(chip);
                      textareaRef.current?.focus();
                    }}
                    className="border border-fade-border bg-bg-card text-text-secondary text-xs rounded-full px-4 py-2 cursor-pointer transition-all duration-200 hover:border-blue-accent/30 hover:bg-blue-accent/10 hover:text-text-primary"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Centered Input Bar */}
              <div className="w-full max-w-xl mx-auto bg-bg-card border border-fade-border rounded-xl px-3 py-2.5 flex items-end gap-2 focus-within:border-blue-accent/30 transition-colors shadow-sm">
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/4 transition-colors shrink-0 mb-0.5">
                  <Paperclip className="w-4 h-4" />
                </button>
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
                  disabled={!hasInput}
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors mb-0.5 ${
                    hasInput
                      ? "bg-blue-accent text-white"
                      : "bg-white/4 text-text-muted cursor-not-allowed"
                  }`}
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 flex flex-col gap-6">
                {messages.map((msg) =>
                  msg.role === "assistant" ? (
                    <div key={msg.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-blue-accent" />
                      </div>
                      <div className="flex flex-col gap-1 items-start max-w-[85%]">
                        <div className="bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-3">
                          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                        {/* Fake Source Pill */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="bg-blue-accent/10 border border-blue-accent/20 text-blue-accent text-[10px] rounded px-2 py-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Source Document
                          </div>
                        </div>
                        <span className="text-text-muted text-[10px] ml-1 mt-0.5">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-4 flex-row-reverse">
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
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-accent/10 border border-blue-accent/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-blue-accent" />
                    </div>
                    <div className="flex items-center bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-4 w-fit">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-accent opacity-60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
              </div>
              
              {/* Bottom Input Bar for Active Chat */}
              <div className="shrink-0 bg-main border-t border-fade-border px-6 py-3">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-bg-card border border-fade-border rounded-xl px-3 py-2.5 flex items-end gap-2 focus-within:border-blue-accent/30 transition-colors shadow-sm">
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/4 transition-colors shrink-0 mb-0.5">
                      <Paperclip className="w-4 h-4" />
                    </button>
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
                      disabled={!hasInput}
                      className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors mb-0.5 ${
                        hasInput
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
