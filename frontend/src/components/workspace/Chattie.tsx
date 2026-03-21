"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  User,
  SendHorizontal,
  Paperclip,
} from "lucide-react";

interface ChattieProps {
  workspaceId: string;
  workspaceName: string;
  auraHex: string;
  auraRgb: string;
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chattie({
  workspaceName,
  auraHex,
  auraRgb,
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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Mock AI reply after delay
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
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="max-w-3xl w-full mx-auto px-4 space-y-5">
          {messages.length === 0 && !isTyping ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: `rgba(${auraRgb}, 0.1)` }}
              >
                <MessageCircle className="w-10 h-10" style={{ color: auraHex }} />
              </div>
              <h2 className="text-text-primary text-lg font-semibold mt-4">
                Hey there! I&apos;m Chattie 👋
              </h2>
              <p className="text-text-muted text-sm text-center max-w-sm mt-2">
                Ask me anything about your uploaded resources in{" "}
                <span style={{ color: auraHex }}>{workspaceName}</span>. I&apos;m
                here to help you study!
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setInput(chip);
                      textareaRef.current?.focus();
                    }}
                    className="bg-bg-card border border-fade-border rounded-full px-4 py-2 text-text-secondary text-xs cursor-pointer transition-all duration-200"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.5)`;
                      e.currentTarget.style.color = auraHex;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.color = "";
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) =>
                msg.role === "assistant" ? (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div
                      className="rounded-full w-8 h-8 shrink-0 flex items-center justify-center mt-1"
                      style={{ backgroundColor: `rgba(${auraRgb}, 0.2)` }}
                    >
                      <MessageCircle
                        className="w-4 h-4"
                        style={{ color: auraHex }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-text-secondary text-sm leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-text-muted text-[10px] mt-1 ml-2 block">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 ml-auto flex-row-reverse max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div
                      className="rounded-full w-8 h-8 shrink-0 flex items-center justify-center mt-1"
                      style={{ backgroundColor: auraHex }}
                    >
                      <User className="text-text-primary w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex flex-col items-end">
                      <div
                        className="rounded-2xl rounded-tr-sm px-4 py-3"
                        style={{
                          backgroundColor: `rgba(${auraRgb}, 0.1)`,
                          border: `1px solid rgba(${auraRgb}, 0.15)`,
                        }}
                      >
                        <p className="text-text-primary text-sm leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-text-muted text-[10px] mt-1 mr-2 block">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div
                    className="rounded-full w-8 h-8 shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `rgba(${auraRgb}, 0.2)` }}
                  >
                    <MessageCircle
                      className="w-4 h-4"
                      style={{ color: auraHex }}
                    />
                  </div>
                  <div className="bg-bg-card border border-fade-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]"
                        style={{ backgroundColor: `rgba(${auraRgb}, 0.6)` }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]"
                        style={{ backgroundColor: `rgba(${auraRgb}, 0.6)` }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]"
                        style={{ backgroundColor: `rgba(${auraRgb}, 0.6)` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input Area */}
      <div className="shrink-0 pb-4">
        <div className="max-w-3xl w-full mx-auto px-4">
          <div className="bg-bg-card border border-fade-border rounded-xl px-4 py-3">
          <div className="flex items-end gap-3">
            <button
              className="w-9 h-9 rounded-full bg-main border border-fade-border flex items-center justify-center text-text-muted transition-all shrink-0"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = auraHex;
                e.currentTarget.style.borderColor = `rgba(${auraRgb}, 0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "";
                e.currentTarget.style.borderColor = "";
              }}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask Chattie anything..."
              rows={1}
              className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none resize-none max-h-30"
            />

            <button
              onClick={handleSend}
              disabled={!hasInput}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
              style={
                hasInput
                  ? { backgroundColor: auraHex, cursor: "pointer" }
                  : {
                      backgroundColor: "var(--main)",
                      border: "1px solid var(--color-fade-border)",
                      cursor: "not-allowed",
                    }
              }
            >
              <SendHorizontal
                className="w-4 h-4"
                style={{
                  color: hasInput
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                }}
              />
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
