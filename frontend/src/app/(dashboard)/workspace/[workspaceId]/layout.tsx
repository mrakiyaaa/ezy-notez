import Link from "next/link";

const navItems = [
  { label: "Overview", path: "" },
  { label: "Resources", path: "resources" },
  { label: "Summarize", path: "summarize" },
  { label: "Quiz", path: "quiz" },
  { label: "Flashcards", path: "flashcards" },
  { label: "Study Room", path: "study-room" },
  { label: "Chatie", path: "chatie" },
];

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const { workspaceId } = params;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* TODO: prepare workspace-level data fetching when APIs are ready. */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-white/10 px-4 py-6 md:px-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">
            Workspace
          </div>
          <p className="mt-2 text-lg font-semibold">ID {workspaceId}</p>
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const href = item.path
                ? `/${workspaceId}/${item.path}`
                : `/${workspaceId}`;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className="block rounded-lg border border-white/5 px-3 py-2 text-sm text-white/70 hover:border-white/20 hover:text-white"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
