export default function WorkspacePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Workspace Summary</h1>
        <p className="mt-2 text-sm text-white/60">
          Workspace ID: {params.workspaceId}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          "Resources in pipeline",
          "AI readiness score",
          "Active study rooms",
        ].map((title) => (
          <div
            key={title}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-sm text-white/60">{title}</p>
            <p className="mt-3 text-2xl font-semibold text-white">--</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Processing Status</h2>
        <p className="mt-2 text-sm text-white/60">
          Track uploads, summaries, and quiz generation as they become ready.
        </p>
        <div className="mt-4 h-2 w-full rounded-full bg-white/10">
          <div className="h-full w-1/3 rounded-full bg-sky-400/70" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Quick AI Actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            "Generate summary",
            "Create flashcards",
            "Launch quiz",
          ].map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:border-white/30"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
