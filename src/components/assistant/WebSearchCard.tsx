import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, ExternalLink, Search } from "lucide-react";

import type { WebSearchResult } from "../../lib/types/library";

interface WebSearchCardProps {
  provider: "tavily" | "exa";
  query: string;
  results: WebSearchResult[];
}

/** Collapsible source summary shown for assistant turns that used web search. */
export function WebSearchCard({ provider, query, results }: WebSearchCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="animate-fade-in rounded-2xl border border-border/70 bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Search className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">
            {t("webSearch.sourceSummary", {
              provider: t(`webSearch.provider.${provider}`),
              count: results.length,
            })}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {query}
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <ol className="mt-2 space-y-2 border-t border-border pt-2">
          {results.map((result, index) => (
            <li key={`${result.url}-${index}`} className="rounded-md bg-muted/60 px-2.5 py-2">
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <span className="truncate">
                  [{index + 1}] {result.title || result.url}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
              {result.snippet && (
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {result.snippet}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
