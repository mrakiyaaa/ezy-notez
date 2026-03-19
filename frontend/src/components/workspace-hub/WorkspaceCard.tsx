import type { Workspace } from "@/types/workspace";

const auraStyles: Record<string, { ring: string; bg: string; text: string }> = {
  blue: {
    ring: "ring-sky-500/40",
    bg: "from-sky-500/10 via-slate-900/60 to-slate-900",
    text: "text-sky-200",
  },
  violet: {
    ring: "ring-violet-500/40",
    bg: "from-violet-500/10 via-slate-900/60 to-slate-900",
    text: "text-violet-200",
  },
  mint: {
    ring: "ring-emerald-500/40",
    bg: "from-emerald-500/10 via-slate-900/60 to-slate-900",
    text: "text-emerald-200",
  },
  amber: {
    ring: "ring-amber-500/40",
    bg: "from-amber-500/10 via-slate-900/60 to-slate-900",
    text: "text-amber-200",
  },
};

const getAura = (aura: string) => auraStyles[aura] ?? auraStyles.blue;

interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen?: (slug: string) => void;
}

export default function WorkspaceCard({
  workspace,
  onOpen,
}: WorkspaceCardProps) {
  const aura = getAura(workspace.aura);
  const created = new Date(workspace.createdAt).toLocaleDateString();

  return (
    <button
      type="button"
      onClick={() => onOpen?.(workspace.slug)}
      className={`group flex h-full min-h-55 flex-col w-full rounded-2xl border border-white/10 bg-linear-to-br ${aura.bg} p-5 text-left shadow-[0_18px_60px_rgba(15,23,42,0.45)] ring-1 ${aura.ring} transition hover:-translate-y-1 hover:border-white/20`}
    >
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.3em] ${aura.text}`}>
              {workspace.aura} aura
            </p>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {workspace.name}
            </h3>
          </div>
        </div>
        {workspace.description && (
          <p className="mt-3 text-sm text-white/70">{workspace.description}</p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-white/50">
        <span>Created {created}</span>
        <span className="rounded-full bg-bg-card px-2 py-1 text-white/60">
          Open
        </span>
      </div>
    </button>
  );
}
