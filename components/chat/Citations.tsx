import { FileText } from "lucide-react";
import type { Citation } from "@/lib/db/schema";

export function Citations({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        Sources
      </p>
      <ol className="flex flex-col gap-1.5">
        {citations.map((c) => {
          const label = c.reference ? `${c.title} — ${c.reference}` : c.title;
          return (
            <li key={c.n} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[11px] font-semibold text-rose">
                {c.n}
              </span>
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy-700 hover:text-rose hover:underline"
                >
                  {label}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
