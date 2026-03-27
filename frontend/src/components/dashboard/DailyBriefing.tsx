interface DailyBriefingProps {
  highlights: string[];
}

export default function DailyBriefing({ highlights }: DailyBriefingProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">Daily AI Briefing</h3>
        <span className="text-xs text-white/50">Updated today</span>
      </div>
      <ul className="mt-4 space-y-3 text-sm text-white/70">
        {highlights.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{item}</span>
          </li>
        ))}
        {highlights.length === 0 ? (
          <li className="text-white/50">No briefing updates yet.</li>
        ) : null}
      </ul>
      <button
        type="button"
        className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white/70 hover:bg-white/10"
      >
        View full analysis
      </button>
    </div>
  );
}
