import { EmptyState, EmptyValue } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import type { Tables } from "@/lib/supabase/types";

export type SettingsHistoryRow = Tables<"settings_history"> & {
  actor_name: string;
};
import { formatDateTime } from "@/lib/utils";

export function SettingsHistoryTab({
  history,
}: {
  history: SettingsHistoryRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Carries its own h2 so heading navigation lands somewhere on this tab
          too. Without it the panel was the only one of the three whose entire
          content hung directly off the page h1. */}
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold tracking-tight">Change History</h2>
        <p className="max-w-[57ch] text-sm text-muted-foreground">
          Append-only. One row per changed field, written in the same
          transaction as the change.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-md border border-border">
          <EmptyState>
            <p>No settings changes recorded yet.</p>
          </EmptyState>
        </div>
      ) : (
        <Table caption="Settings change history">
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead className="text-right">From</TableHead>
              <TableHead className="text-right">To</TableHead>
              <TableHead>Changed by</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((row) => (
              <TableRow key={row.id}>
                {/* `header` per the rule in data-table.tsx: the field name is
                    what this row is about, so it is the row's `th`. Without it
                    a screen reader walking the row hears "From, 18.00" with
                    nothing saying which setting moved. */}
                <TableCell header className="font-mono text-xs">
                  {row.changed_field}
                </TableCell>
                <TableCell numeric className="text-right text-muted-foreground">
                  {/* Nullable on the first write of any setting, and a bare
                      dash announces as silence -- see EmptyValue. */}
                  {row.old_value ?? <EmptyValue label="No previous value" />}
                </TableCell>
                <TableCell numeric className="text-right font-semibold">
                  {row.new_value ?? <EmptyValue label="Value cleared" />}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.actor_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(row.changed_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
