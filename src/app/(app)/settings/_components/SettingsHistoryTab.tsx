import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import type { SettingsHistoryRow } from "@/lib/mock";
import { formatDateTime } from "@/lib/utils";

export function SettingsHistoryTab({
  history,
}: {
  history: SettingsHistoryRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Append-only. One row per changed field, written in the same transaction
        as the change.
      </p>

      {history.length === 0 ? (
        <div className="rounded-md border border-border">
          <EmptyState>
            <p>No settings changes recorded yet.</p>
          </EmptyState>
        </div>
      ) : (
        <Table>
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
                <TableCell className="font-mono text-xs">
                  {row.changed_field}
                </TableCell>
                <TableCell numeric className="text-right text-muted-foreground">
                  {row.old_value ?? "-"}
                </TableCell>
                <TableCell numeric className="text-right font-semibold">
                  {row.new_value ?? "-"}
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
