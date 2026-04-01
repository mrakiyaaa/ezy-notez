import ReactMarkdown from "react-markdown";
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

  return (
    <div className="flex flex-col gap-2">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2
              className="text-lg font-semibold mb-3"
              style={{ color: auraHex }}
            >
              {children}
            </h2>
          ),
          p: ({ children }) => (
            <p className="text-text-primary text-sm leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="flex flex-col gap-2">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-2.5 items-start list-none">
              <span
                className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: auraHex }}
              />
              <span className="text-text-primary text-sm leading-relaxed">
                {children}
              </span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-text-secondary italic">{children}</em>
          ),
        }}
      >
        {summary.content}
      </ReactMarkdown>
    </div>
  );
}
