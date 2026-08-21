import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QUOTE_STATUS_LABEL } from "@/lib/types/quote";
import type { Database } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";
import type { DbQuoteHistory } from "./quote-builder";

type QuoteStatus = Database["public"]["Enums"]["quote_status"];

/**
 * PRD-017 / NFR-005 — the append-only `quote_status_history` trail, surfaced.
 *
 * Worth having on the screen rather than buried in an admin view: the audit row
 * is written in the same transaction as the status change, so if a transition
 * happened there is a row for it, and if there is no row it did not happen.
 * Showing it makes "quote history is never a guess" (PRODUCT.md §1) something
 * a rep can see rather than something the schema merely promises.
 *
 * Holds no state and imports nothing server-only, so it renders correctly
 * whether a Server Component or the client-side builder is what mounts it.
 */
export function StatusHistory({ rows }: { rows: DbQuoteHistory[] }) {
  const ordered = [...rows].sort((a, b) =>
    b.changed_at.localeCompare(a.changed_at),
  );

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold tracking-tight">History</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Every status change, with who made it and when.
        </p>
      </div>

      {ordered.length === 0 ? (
        <EmptyState size="sm">
          <p>Nothing yet — this quote has not been saved.</p>
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-3">
          {ordered.map((row) => (
            <li key={row.id} className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">
                {row.from_status
                  ? `${QUOTE_STATUS_LABEL[row.from_status as QuoteStatus]} → ${QUOTE_STATUS_LABEL[row.to_status as QuoteStatus]}`
                  : `Created as ${QUOTE_STATUS_LABEL[row.to_status as QuoteStatus]}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.actor_name} · {formatDateTime(row.changed_at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
