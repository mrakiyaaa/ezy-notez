import type { Summary } from "@/types/summary";

interface SummaryContentProps {
  summary: Summary;
  auraHex: string;
}

export default function SummaryContent({
  summary,
  auraHex,
}: SummaryContentProps) {
  if (summary.status === "failed") {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-900/10 p-4">
        <p className="text-red-400 text-sm font-medium mb-1">
          Summarization failed
        </p>
        <p className="text-red-400/80 text-xs">
          {summary.error_message ?? "An unknown error occurred."}
        </p>
      </div>
    );
  }

  if (!summary.content) {
    return (
      <p className="text-text-muted text-sm italic">No content available.</p>
    );
  }

  const contentLines = summary.content.split("\n");

  return (
    <div className="flex flex-col gap-2">
      {contentLines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;

        if (trimmed.startsWith("- ")) {
          return (
            <div key={index} className="flex gap-2.5 items-start">
              <span
                className="mt-1.75 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: auraHex }}
              />
              <p className="text-text-primary text-sm leading-relaxed">
                {trimmed.slice(2)}
              </p>
            </div>
          );
        }

        return (
          <p key={index} className="text-text-primary text-sm leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
