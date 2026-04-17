"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Copy, Check, ArrowRight, FileText } from "lucide-react";
import type { CreateStudyRoomPayload, InviteMethod, StudyRoom } from "@/types/studyRoom";
import type { Resource } from "@/types/resource";
import { getWorkspaceResources } from "@/services/resource.service";
import { createStudyRoom } from "@/services/studyRoom.service";

interface CreateRoomModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onCreated: (room: StudyRoom) => void;
}

type Step = "setup" | "confirmation";

export default function CreateRoomModal({
  isOpen,
  workspaceId,
  onClose,
  onCreated,
}: CreateRoomModalProps) {
  const [step, setStep] = useState<Step>("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("otp");
  const [emailInput, setEmailInput] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Created room
  const [createdRoom, setCreatedRoom] = useState<StudyRoom | null>(null);
  const [otpCopied, setOtpCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setResourcesLoading(true);
    getWorkspaceResources(workspaceId)
      .then((res) => setResources(res.filter((r) => r.status === "ready")))
      .catch(console.error)
      .finally(() => setResourcesLoading(false));
  }, [isOpen, workspaceId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep("setup");
      setTitle("");
      setDescription("");
      setQuestionCount(20);
      setSelectedResources([]);
      setInviteMethod("otp");
      setEmailInput("");
      setInvitedEmails([]);
      setCreatedRoom(null);
      setError(null);
      setOtpCopied(false);
    }
  }, [isOpen]);

  const toggleResource = (id: string) => {
    setSelectedResources((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    if (invitedEmails.includes(trimmed)) {
      setError("Email already added");
      return;
    }
    setInvitedEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
    setError(null);
  };

  const removeEmail = (email: string) => {
    setInvitedEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Room title is required");
      return;
    }
    if (selectedResources.length === 0) {
      setError("Select at least 1 resource");
      return;
    }
    if (questionCount < 20) {
      setError("Minimum 20 questions required");
      return;
    }

    // Auto-add any email still in the input field before submitting
    let emailsToSend = invitedEmails;
    if (inviteMethod === "email" && emailInput.trim()) {
      const trimmed = emailInput.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError("Please enter a valid email address");
        return;
      }
      if (!invitedEmails.includes(trimmed)) {
        emailsToSend = [...invitedEmails, trimmed];
        setInvitedEmails(emailsToSend);
        setEmailInput("");
      }
    }

    if (inviteMethod === "email" && emailsToSend.length === 0) {
      setError("Add at least one email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CreateStudyRoomPayload = {
        workspace_id: workspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        question_count: questionCount,
        resource_ids: selectedResources,
        invite_method: inviteMethod,
        emails: inviteMethod === "email" ? emailsToSend : undefined,
      };

      const room = await createStudyRoom(payload);
      setCreatedRoom(room);
      setStep("confirmation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const copyOtp = useCallback(() => {
    if (!createdRoom?.otp_code) return;
    navigator.clipboard.writeText(createdRoom.otp_code);
    setOtpCopied(true);
    setTimeout(() => setOtpCopied(false), 2000);
  }, [createdRoom?.otp_code]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-bg-card border border-fade-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-fade-border">
          <h2 className="text-text-primary font-semibold text-lg">
            {step === "setup" ? "Create Study Room" : "Room Created!"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === "setup" ? (
            <div className="space-y-5">
              {/* Room Title */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Room Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(null); }}
                  placeholder="e.g., Data Structures Review"
                  className="w-full rounded-lg border border-fade-border bg-white/[0.03] px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Description <span className="text-text-muted text-xs">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the study session..."
                  rows={2}
                  className="w-full rounded-lg border border-fade-border bg-white/[0.03] px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent/50 transition-colors resize-none"
                />
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Question Count <span className="text-text-muted text-xs">(min 20)</span>
                </label>
                <input
                  type="number"
                  min={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(20, Number(e.target.value)))}
                  className="w-32 rounded-lg border border-fade-border bg-white/[0.03] px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-blue-accent/50 transition-colors"
                />
              </div>

              {/* Resource Selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Select Resources <span className="text-red-400">*</span>
                </label>
                {resourcesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-text-muted text-sm">
                    <div className="w-4 h-4 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
                    Loading resources...
                  </div>
                ) : resources.length === 0 ? (
                  <p className="text-text-muted text-sm py-3">
                    No ready resources in this workspace. Upload resources first.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-fade-border bg-white/[0.02] divide-y divide-fade-border">
                    {resources.map((res) => {
                      const isSelected = selectedResources.includes(res.id);
                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => toggleResource(res.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-blue-accent/10"
                              : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-blue-accent border-blue-accent"
                                : "border-fade-border"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-sm text-text-secondary truncate">
                            {res.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedResources.length > 0 && (
                  <p className="text-[11px] text-text-muted mt-1.5">
                    {selectedResources.length} resource{selectedResources.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              {/* Invite Method Toggle */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Invite Method
                </label>
                <div className="flex rounded-lg bg-white/[0.03] border border-fade-border p-1">
                  <button
                    type="button"
                    onClick={() => setInviteMethod("otp")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      inviteMethod === "otp"
                        ? "bg-blue-accent text-white shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    OTP Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteMethod("email")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      inviteMethod === "email"
                        ? "bg-blue-accent text-white shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Email Invites
                  </button>
                </div>

                {/* OTP info */}
                {inviteMethod === "otp" && (
                  <p className="text-[12px] text-text-muted mt-2 leading-relaxed">
                    An OTP code will be generated when the room is created. Share it with friends to join.
                  </p>
                )}

                {/* Email input */}
                {inviteMethod === "email" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); setError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                        placeholder="friend@email.com"
                        className="flex-1 rounded-lg border border-fade-border bg-white/[0.03] px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-accent/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addEmail}
                        className="px-3 py-2 rounded-lg bg-white/[0.06] border border-fade-border text-text-secondary hover:bg-white/[0.1] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {invitedEmails.length > 0 && (
                      <div className="space-y-1">
                        {invitedEmails.map((email) => (
                          <div
                            key={email}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] border border-fade-border"
                          >
                            <span className="text-sm text-text-secondary truncate">
                              {email}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEmail(email)}
                              className="text-text-muted hover:text-red-400 transition-colors shrink-0 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-accent text-white font-medium text-sm transition-all duration-200 hover:bg-blue-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Room"
                )}
              </button>
            </div>
          ) : (
            /* Confirmation Step */
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-full bg-blue-accent/15 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-blue-accent" />
              </div>
              <h3 className="text-text-primary font-semibold text-lg mb-1">
                {createdRoom?.title}
              </h3>
              <p className="text-text-muted text-sm mb-6">
                Your study room has been created successfully
              </p>

              {/* OTP Code Display */}
              {createdRoom?.invite_method === "otp" && createdRoom.otp_code && (
                <div className="w-full mb-6">
                  <p className="text-text-secondary text-sm mb-3">
                    Share this OTP code with your friends
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1.5">
                      {createdRoom.otp_code.split("").map((digit, i) => (
                        <span
                          key={i}
                          className="w-11 h-14 rounded-lg bg-white/[0.05] border border-fade-border flex items-center justify-center text-text-primary text-2xl font-bold sr-pulse-glow"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={copyOtp}
                      className="p-2.5 rounded-lg bg-white/[0.06] border border-fade-border text-text-muted hover:text-text-primary hover:bg-white/[0.1] transition-colors"
                      title="Copy OTP"
                    >
                      {otpCopied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Email confirmation */}
              {createdRoom?.invite_method === "email" && (
                <div className="w-full mb-6 rounded-lg bg-white/[0.03] border border-fade-border p-4">
                  <p className="text-text-secondary text-sm">
                    Invitation emails have been sent to your friends. They will receive a link to join the room.
                  </p>
                </div>
              )}

              {/* Go to Lobby */}
              <button
                onClick={() => createdRoom && onCreated(createdRoom)}
                className="w-full py-3 rounded-lg bg-blue-accent text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:bg-blue-accent/80"
              >
                Go to Lobby
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
