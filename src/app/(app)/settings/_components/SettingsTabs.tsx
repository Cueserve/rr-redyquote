"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { ReadOnlyNotice } from "@/components/prototype/admin-only";
import { useIsAdmin } from "@/components/prototype/role-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Settings, SettingsHistoryRow } from "@/lib/mock";
import { formatDateTime } from "@/lib/utils";

/**
 * PRD-012 (estimating defaults), PRD-013 (branding), PRD-018A (audit).
 *
 * Every field here is an INPUT to the pricing formula, not an output of it — a
 * rate, a markup, a percentage, a threshold. That is why this screen can be
 * built in full while the quote builder's summary panel cannot: PRD §2A leaves
 * open how these combine, not what they are.
 *
 * The audit tab is a first-class tab rather than a buried link. `settings_history`
 * is written by a trigger in the same transaction as the change (PRD-018A), so
 * "who moved the margin floor, and when" is answerable — and a screen that can
 * answer it should.
 */

interface NumericFieldSpec {
  key: keyof Settings;
  label: string;
  help: string;
  suffix: "%" | "$" | "months";
}

const RATE_FIELDS: NumericFieldSpec[] = [
  {
    key: "labor_rate",
    label: "Labor rate",
    help: "Applied to every labor hour on a quote, per hour.",
    suffix: "$",
  },
  {
    key: "fab_markup_percent",
    label: "Fabrication markup",
    help: "Applied to the fab tier cost.",
    suffix: "%",
  },
  {
    key: "component_markup_percent",
    label: "Component markup",
    help: "Default markup pre-filled on a new quote line.",
    suffix: "%",
  },
  {
    key: "cushion_percent",
    label: "Cushion",
    help: "Contingency added to the cost basis.",
    suffix: "%",
  },
  {
    key: "commission_percent",
    label: "Sales commission",
    help: "Rep commission carried in the cost basis.",
    suffix: "%",
  },
  {
    key: "margin_floor_percent",
    label: "Margin floor",
    help: "A quote below this is flagged. Advisory only — it never blocks a save or a submit.",
    suffix: "%",
  },
];

const FRESHNESS_FIELDS: NumericFieldSpec[] = [
  {
    key: "freshness_warning_months",
    label: "Aging after",
    help: "A cost older than this shows an Aging badge.",
    suffix: "months",
  },
  {
    key: "freshness_requote_months",
    label: "Re-quote after",
    help: "A cost older than this shows a Re-quote badge. Must be greater than the aging threshold.",
    suffix: "months",
  },
];

function NumericField({
  spec,
  value,
  disabled,
}: {
  spec: NumericFieldSpec;
  value: number;
  disabled: boolean;
}) {
  const id = `setting-${String(spec.key)}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {spec.label}
      </label>
      <div className="flex items-center gap-2">
        {spec.suffix === "$" ? (
          <span className="font-mono text-sm text-muted-foreground">$</span>
        ) : null}
        <Input
          id={id}
          variant="editable"
          inputMode="decimal"
          defaultValue={value}
          disabled={disabled}
          className="w-32 text-right"
        />
        {spec.suffix !== "$" ? (
          <span className="text-sm text-muted-foreground">{spec.suffix}</span>
        ) : null}
      </div>
      <span className="max-w-prose text-xs text-muted-foreground">
        {spec.help}
      </span>
    </div>
  );
}

export function SettingsTabs({
  settings,
  history,
}: {
  settings: Settings;
  history: SettingsHistoryRow[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  return (
    <Tabs defaultValue="defaults" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="defaults">Estimating defaults</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="history">Change history</TabsTrigger>
      </TabsList>

      <TabsContent value="defaults" className="flex flex-col gap-6">
        {readOnly ? <ReadOnlyNotice what="Estimating defaults" /> : null}

        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">
              Rates and markups
            </h2>
            <p className="text-sm text-muted-foreground">
              These are the inputs every quote is priced from. Changing one does
              not reprice quotes that are already saved — each quote snapshots
              its cost basis at save time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {RATE_FIELDS.map((spec) => (
              <NumericField
                key={String(spec.key)}
                spec={spec}
                value={settings[spec.key] as number}
                disabled={readOnly}
              />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">
              Price freshness
            </h2>
            <p className="text-sm text-muted-foreground">
              Both badges and the stale-price count on the quotes dashboard are
              measured against these two thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FRESHNESS_FIELDS.map((spec) => (
              <NumericField
                key={String(spec.key)}
                spec={spec}
                value={settings[spec.key] as number}
                disabled={readOnly}
              />
            ))}
          </div>
        </Card>

        {isAdmin ? (
          <div className="flex items-center gap-3">
            <Button>Save settings</Button>
            <p className="text-xs text-muted-foreground">
              Each changed field writes an audit row in the same transaction.
            </p>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="branding" className="flex flex-col gap-6">
        {readOnly ? <ReadOnlyNotice what="Branding" /> : null}

        <Card className="flex max-w-2xl flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">Favicon</h2>
            <p className="text-sm text-muted-foreground">
              Resized to 64×64 and applied for every user. There is one favicon
              for the whole organisation.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-md border border-border bg-muted">
              {settings.favicon_url ? (
                <span className="font-mono text-xs text-muted-foreground">
                  64×64
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Button variant="outline" disabled={readOnly}>
                <Upload />
                Upload favicon
              </Button>
              <span className="text-xs text-muted-foreground">
                PNG or SVG. Anything larger is resized on upload.
              </span>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Append-only. One row per changed field, written in the same
          transaction as the change.
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
                  <TableCell
                    numeric
                    className="text-right text-muted-foreground"
                  >
                    {row.old_value ?? "—"}
                  </TableCell>
                  <TableCell numeric className="text-right font-semibold">
                    {row.new_value ?? "—"}
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
      </TabsContent>
    </Tabs>
  );
}
