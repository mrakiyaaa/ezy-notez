"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInviteByToken, acceptInvite } from "@/services/studyRoom.service";
import { supabase } from "@/lib/supabase/client";
import type { StudyRoom } from "@/types/studyRoom";

type PageState = "loading" | "ready" | "accepting" | "error" | "already_used";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<PageState>("loading");
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) return;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/auth/login?redirect=/study-rooms/invite/${token}`);
        return;
      }

      try {
        const { room, email } = await getInviteByToken(token);
        setRoom(room);
        setInviteEmail(email);
        setState("ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid invite link";
        if (msg.toLowerCase().includes("already been used")) {
          setState("already_used");
        } else {
          setErrorMsg(msg);
          setState("error");
        }
      }
    };

    init();
  }, [token, router]);

  const handleAccept = async () => {
    if (!room) return;
    setState("accepting");

    try {
      await acceptInvite(token);
      router.push(`/study-rooms/${room.id}/lobby`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to accept invite");
      setState("error");
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (state === "already_used") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
            </svg>
          </div>
          <h1 className="text-text-primary font-semibold text-xl mb-2">Invite Already Used</h1>
          <p className="text-text-muted text-sm mb-6">This invitation has already been accepted.</p>
          <button
            onClick={() => router.push("/workspaces")}
            className="px-6 py-2.5 rounded-lg bg-blue-accent text-white text-sm font-medium hover:bg-blue-accent/80 transition-colors"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-text-primary font-semibold text-xl mb-2">Invalid Invite</h1>
          <p className="text-text-muted text-sm mb-6">{errorMsg || "This invite link is invalid or has expired."}</p>
          <button
            onClick={() => router.push("/workspaces")}
            className="px-6 py-2.5 rounded-lg bg-blue-accent text-white text-sm font-medium hover:bg-blue-accent/80 transition-colors"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-bg-card border border-fade-border shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-accent to-blue-600 px-8 py-7 text-center">
            <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-2">EzyNotez</p>
            <h1 className="text-white text-2xl font-bold">Study Room Invite</h1>
          </div>

          <div className="px-8 py-7">
            <p className="text-text-secondary text-sm mb-5">
              You&apos;ve been invited to join a collaborative study session.
            </p>

            <div className="rounded-lg bg-white/[0.03] border border-fade-border px-5 py-4 mb-6">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Room</p>
              <p className="text-text-primary text-lg font-bold">{room?.title}</p>
              {room?.description && (
                <p className="text-text-muted text-sm mt-1">{room.description}</p>
              )}
            </div>

            {inviteEmail && (
              <p className="text-text-muted text-xs mb-6">
                This invite was sent to <span className="text-text-secondary">{inviteEmail}</span>
              </p>
            )}

            <button
              onClick={handleAccept}
              disabled={state === "accepting"}
              className="w-full py-3 rounded-lg bg-blue-accent text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-accent/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {state === "accepting" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                "Accept & Join Lobby"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
