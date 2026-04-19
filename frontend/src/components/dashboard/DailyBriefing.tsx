interface DailyBriefingProps {
  highlights: string[];
  isLoading?: boolean;
}

export default function DailyBriefing({
  highlights,
  isLoading = false,
}: DailyBriefingProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">Daily Briefing</h3>
        <span className="text-xs text-white/50">Updated live</span>
      </div>
      <ul className="mt-4 space-y-3 text-sm text-white/70">
        {isLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex gap-2 animate-pulse">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/10" />
                <span className="h-3 flex-1 rounded bg-white/10" />
              </li>
            ))}
          </>
        ) : highlights.length === 0 ? (
          <li className="text-white/50">No briefing updates yet.</li>
        ) : (
          highlights.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>{item}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
