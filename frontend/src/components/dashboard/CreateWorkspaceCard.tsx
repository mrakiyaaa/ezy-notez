interface CreateWorkspaceCardProps {
  onOpen: () => void;
}

export default function CreateWorkspaceCard({ onOpen }: CreateWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full min-h-55 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-white/70 transition hover:border-white/40 hover:bg-white/10"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl">
        +
      </div>
      <div>
        <p className="text-base font-semibold text-text-primary">New workspace</p>
        <p className="mt-1 text-sm text-white/60">
          Create a private AI hub for your study plan.
        </p>
      </div>
    </button>
  );
}
