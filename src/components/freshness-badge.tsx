import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Freshness } from "@/lib/mock";

/**
 * PRD-009's Current / Aging / Re-quote badge, applied to any cost carrying a
 * `quoted_date` — component costs and fab-tier costs alike.
 *
 * The three states are derived from `settings.freshness_warning_months` and
 * `freshness_requote_months`. That derivation is NOT here: PRD-009 requires the
 * badge and the dashboard's stale-price count to come from the same configured
 * thresholds everywhere they appear, which means exactly one shared module owns
 * it. This component renders a state it is handed and nothing more.
 *
 * `requote` is destructive-toned rather than warning-toned so the two states
 * are distinguishable at a glance in a dense table — and because in a warning/
 * amber-heavy screen (every editable cell is amber, DESIGN-SYSTEM.md §7) an
 * amber "re-quote" badge would disappear into the field tint.
 */
const FRESHNESS: Record<
  Freshness,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  current: { label: "Current", variant: "success" },
  aging: { label: "Aging", variant: "warning" },
  requote: { label: "Re-quote", variant: "destructive" },
};

export function FreshnessBadge({
  freshness,
  quotedDate,
}: {
  freshness: Freshness;
  /** Shown as the accessible title so a badge is never the only carrier. */
  quotedDate?: string;
}) {
  const { label, variant } = FRESHNESS[freshness];

  return (
    <Badge
      variant={variant}
      dot
      title={quotedDate ? `Quoted ${formatDate(quotedDate)}` : undefined}
    >
      {label}
    </Badge>
  );
}

/** PRD-018 — a deactivated product or component stays on quotes that already
 *  reference it, priced as-is, but is marked. */
export function DeactivatedBadge() {
  return <Badge variant="outline">Deactivated</Badge>;
}
