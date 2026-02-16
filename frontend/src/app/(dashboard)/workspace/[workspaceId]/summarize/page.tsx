export default function SummarizePage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Summarize</h2>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:border-white/30"
        >
          Generate summary
        </button>
      </header>
      <p className="text-sm text-white/60">
        AI summaries, key points, and citations will surface here.
      </p>
    </div>
  );
}
