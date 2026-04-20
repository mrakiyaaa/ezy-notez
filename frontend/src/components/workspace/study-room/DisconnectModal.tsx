"use client";

interface DisconnectModalProps {
  participantName: string;
  onContinue: () => void;
  onWait: () => void;
}

export default function DisconnectModal({
  participantName,
  onContinue,
  onWait,
}: DisconnectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] shadow-2xl p-6 text-center sr-fade-in">
        <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">&#9888;</span>
        </div>
        <h3 className="text-text-primary font-semibold text-lg mb-2">
          Participant Disconnected
        </h3>
        <p className="text-text-muted text-sm mb-6">
          <span className="text-text-secondary font-medium">{participantName}</span>{" "}
          has disconnected. Continue without them or wait?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onWait}
            className="flex-1 py-2.5 rounded-lg border-white/[0.08] bg-white/[0.04] text-text-secondary text-sm font-medium hover:bg-white/[0.08] transition-colors"
          >
            Wait
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 rounded-lg bg-blue-accent text-white text-sm font-medium hover:bg-blue-accent/80 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
