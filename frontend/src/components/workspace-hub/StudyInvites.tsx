import type { Invite } from "@/types/invite";

interface StudyInvitesProps {
  invites: Invite[];
  onAccept?: (inviteId: string) => void;
  onDecline?: (inviteId: string) => void;
}

export default function StudyInvites({
  invites,
  onAccept,
  onDecline,
}: StudyInvitesProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Study Room Invites</h3>
        <span className="text-xs text-white/50">{invites.length} pending</span>
      </div>
      <div className="mt-4 space-y-4">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/10" />
              <div>
                <p className="text-sm text-white">
                  {invite.inviterName} invited you to {invite.workspaceName}
                </p>
                <p className="text-xs text-white/50">{invite.message}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onAccept?.(invite.id)}
                className="flex-1 rounded-lg bg-blue-accent px-3 py-1.5 text-xs font-semibold text-white hover:border-blue-400/70 hover:bg-transparent hover:ring-1 hover:ring-blue-400/70"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => onDecline?.(invite.id)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
        {invites.length === 0 ? (
          <p className="text-sm text-white/50">No invites right now.</p>
        ) : null}
      </div>
    </div>
  );
}
