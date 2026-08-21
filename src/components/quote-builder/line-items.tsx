"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";

import { DeactivatedBadge, FreshnessBadge } from "@/components/freshness-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyValue } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  DbCategory,
  DbComponent,
  DbQuoteLine,
  QuoteEnvironment,
} from "./quote-builder";
import { cn, formatHours, formatMoney } from "@/lib/utils";

/**
 * PRD-007A's line structure, rendered literally: one row per fixed category,
 * always present whether filled or not, then unlimited misc rows below a rule.
 *
 * The structure is the point. A rep cannot add a second "Display" row because
 * there is no control that would create one — the fixed block is a fixed list,
 * not an append-able one. Misc rows are the only thing "Add misc line" touches.
 * The database enforces the same invariant independently
 * (`uq_quote_lines_one_per_fixed_category`, docs/DATABASE.md §5).
 *
 * Editable vs calculated (DESIGN-SYSTEM.md §7) is applied strictly:
 *   - Editable — hard cost, labor hours, markup. Amber tint, amber border,
 *     mono tabular digits.
 *   - Calculated — labor cost. No tint, no border, plain text.
 * A calculated cell on an edited row renders as an em dash rather than a stale
 * figure, because the trusted value is the one the server recomputes at save
 * (NFR-007) and this prototype has no formula to preview with (PRD §7A).
 */

const ENVIRONMENT_LABEL: Record<string, string> = {
  any: "Any",
  indoor: "Indoor",
  outdoor: "Outdoor",
};

function PendingValue() {
  return (
    <Tooltip>
      {/* Labelled, because the dash alone tells a screen reader nothing. */}
      <TooltipTrigger
        aria-label="Pending calculation"
        className="text-muted-foreground"
      >
        —
      </TooltipTrigger>
      <TooltipContent>
        Recomputed server-side when the quote is saved.
      </TooltipContent>
    </Tooltip>
  );
}

function LineFlags({
  line,
  environment,
}: {
  line: DbQuoteLine;
  environment: QuoteEnvironment;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {line.environment_mismatch ? (
        // PRD-008 — an indoor-only component on an outdoor quote. Flagged, not
        // blocked: the rep may have a reason, and the docs never call it an
        // error.
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="cursor-default">
              <TriangleAlert aria-hidden="true" />
              Environment
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            This component is not rated for an {environment} installation.
          </TooltipContent>
        </Tooltip>
      ) : null}
      {line.component_deactivated ? <DeactivatedBadge /> : null}
      {!line.is_misc ? <FreshnessBadge freshness={line.freshness} /> : null}
    </div>
  );
}

export interface LineItemsProps {
  categories: DbCategory[];
  components: DbComponent[];
  lines: DbQuoteLine[];
  environment: QuoteEnvironment;
  editedLineIds: Set<string>;
  readOnly: boolean;
  onSelectComponent: (categoryId: string, componentId: string | null) => void;
  onChangeLine: (
    lineId: string,
    field: "description" | "hard_cost" | "labor_hours" | "markup_percent",
    value: string,
  ) => void;
  onAddMisc: () => void;
  onRemoveMisc: (lineId: string) => void;
}

export function LineItems({
  categories,
  components,
  lines,
  environment,
  editedLineIds,
  readOnly,
  onSelectComponent,
  onChangeLine,
  onAddMisc,
  onRemoveMisc,
}: LineItemsProps) {
  const miscLines = lines
    .filter((line) => line.is_misc)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-3">
      <Table caption="Line items on this quote">
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Category</TableHead>
            <TableHead className="w-64">Component</TableHead>
            <TableHead className="w-28 text-right">Hard cost</TableHead>
            <TableHead className="w-24 text-right">Labor hrs</TableHead>
            <TableHead className="w-28 text-right">Labor cost</TableHead>
            <TableHead className="w-24 text-right">Markup</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Row actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {categories.map((category) => {
            const line =
              lines.find(
                (candidate) =>
                  !candidate.is_misc && candidate.category_id === category.id,
              ) ?? null;
            const options = components.filter(
              (component) =>
                component.category_id === category.id &&
                // PRD-018: a deactivated component is not selectable for new
                // lines, but stays visible on a line that already references it.
                (component.active || component.id === line?.component_id),
            );
            const isEdited = line ? editedLineIds.has(line.id) : false;

            return (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>

                <TableCell>
                  <Select
                    value={line?.component_id ?? "none"}
                    disabled={readOnly}
                    onValueChange={(value) =>
                      onSelectComponent(
                        category.id,
                        value === "none" ? null : value,
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="None selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None selected</SelectItem>
                      {options.map((component) => (
                        <SelectItem key={component.id} value={component.id}>
                          {component.name}
                          {component.environment !== "any"
                            ? ` · ${ENVIRONMENT_LABEL[component.environment]}`
                            : ""}
                          {!component.active ? " · deactivated" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell numeric className="text-right">
                  {line ? (
                    <Input
                      variant="editable"
                      value={line.hard_cost}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-label={`${category.name} hard cost`}
                      onChange={(event) =>
                        onChangeLine(line.id, "hard_cost", event.target.value)
                      }
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  ) : (
                    <EmptyValue label="No line on this quote" />
                  )}
                </TableCell>

                <TableCell numeric className="text-right">
                  {line ? (
                    <Input
                      variant="editable"
                      value={line.labor_hours}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-label={`${category.name} labor hours`}
                      onChange={(event) =>
                        onChangeLine(line.id, "labor_hours", event.target.value)
                      }
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  ) : (
                    <EmptyValue label="No line on this quote" />
                  )}
                </TableCell>

                {/* Calculated — no tint, no border (DESIGN-SYSTEM.md §7). */}
                <TableCell numeric className="text-right">
                  {!line ? (
                    <EmptyValue label="No line on this quote" />
                  ) : isEdited ? (
                    <PendingValue />
                  ) : (
                    formatMoney(line.labor_cost)
                  )}
                </TableCell>

                <TableCell numeric className="text-right">
                  {line ? (
                    <Input
                      variant="editable"
                      value={line.markup_percent}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-label={`${category.name} markup percent`}
                      onChange={(event) =>
                        onChangeLine(
                          line.id,
                          "markup_percent",
                          event.target.value,
                        )
                      }
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  ) : (
                    <EmptyValue label="No line on this quote" />
                  )}
                </TableCell>

                <TableCell>
                  {line ? (
                    <LineFlags line={line} environment={environment} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not quoted
                    </span>
                  )}
                </TableCell>

                {/* A fixed-category row is never removable — clearing it means
                    setting its component back to "None selected". */}
                <TableCell />
              </TableRow>
            );
          })}

          <TableRow className="hover:bg-card">
            <TableCell
              colSpan={8}
              className="bg-muted py-1.5 text-xs font-semibold text-muted-foreground"
            >
              Misc lines — unlimited, exempt from the one-per-category rule
              (PRD-007A)
            </TableCell>
          </TableRow>

          {miscLines.length === 0 ? (
            <TableRow className="hover:bg-card">
              <TableCell colSpan={8} className="text-sm text-muted-foreground">
                No misc lines.
              </TableCell>
            </TableRow>
          ) : (
            miscLines.map((line) => {
              const isEdited = editedLineIds.has(line.id);
              return (
                <TableRow key={line.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    Misc
                  </TableCell>

                  <TableCell>
                    <Input
                      variant="editable"
                      value={line.description}
                      disabled={readOnly}
                      aria-label="Misc line description"
                      placeholder="Describe this line"
                      onChange={(event) =>
                        onChangeLine(line.id, "description", event.target.value)
                      }
                      className="h-8 w-full px-2 py-1 text-sm"
                    />
                  </TableCell>

                  <TableCell numeric className="text-right">
                    <Input
                      variant="editable"
                      value={line.hard_cost}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-label="Misc line hard cost"
                      onChange={(event) =>
                        onChangeLine(line.id, "hard_cost", event.target.value)
                      }
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  </TableCell>

                  <TableCell numeric className="text-right">
                    <Input
                      variant="editable"
                      value={line.labor_hours}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-label="Misc line labor hours"
                      onChange={(event) =>
                        onChangeLine(line.id, "labor_hours", event.target.value)
                      }
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  </TableCell>

                  <TableCell numeric className="text-right">
                    {isEdited ? <PendingValue /> : formatMoney(line.labor_cost)}
                  </TableCell>

                  <TableCell numeric className="text-right">
                    <Input
                      variant="editable"
                      value={line.markup_percent}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-label="Misc line markup percent"
                      onChange={(event) =>
                        onChangeLine(
                          line.id,
                          "markup_percent",
                          event.target.value,
                        )
                      }
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  </TableCell>

                  <TableCell>
                    <LineFlags line={line} environment={environment} />
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={readOnly}
                      aria-label="Remove misc line"
                      onClick={() => onRemoveMisc(line.id)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={readOnly}
          onClick={onAddMisc}
        >
          <Plus />
          Add misc line
        </Button>
        <p className={cn("text-xs text-muted-foreground")}>
          Total labor hours{" "}
          <span className="font-mono tabular-nums">
            {formatHours(
              lines.reduce(
                (sum, line) => sum + Number(line.labor_hours || 0),
                0,
              ),
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
