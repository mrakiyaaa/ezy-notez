import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Summary } from "@/types/summary";

interface SummaryContentProps {
  summary: Summary;
}

function FailedSummary({ errorMessage }: { errorMessage: string | null }) {
  const [showDetail, setShowDetail] = useState(false);

  const isLong = (errorMessage?.length ?? 0) > 120;
  const preview = isLong ? errorMessage!.slice(0, 120).trimEnd() + "…" : errorMessage;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-red-400 text-sm font-semibold mb-1">Summarization failed</p>
          <p className="text-red-400/70 text-xs leading-relaxed">
            {isLong && !showDetail ? preview : (errorMessage ?? "An unknown error occurred.")}
          </p>
        </div>
      </div>

      {isLong && (
        <button
          onClick={() => setShowDetail((v) => !v)}
          className="self-start flex items-center gap-1 text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
        >
          {showDetail ? (
            <><ChevronUp className="w-3 h-3" /> Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show full error</>
          )}
        </button>
      )}
    </div>
  );
}

export default function SummaryContent({
  summary,
}: SummaryContentProps) {
  if (summary.status === "failed") {
    return <FailedSummary errorMessage={summary.error_message} />;
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
              className="text-lg font-semibold mb-3 text-text-primary"
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
                style={{ backgroundColor: "var(--color-blue-accent)" }}
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
