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
  /** Read out after the label so the badge is never the only carrier. */
  quotedDate?: string;
}) {
  const { label, variant } = FRESHNESS[freshness];

  return (
    <Badge variant={variant} dot>
      {label}
      {/* `sr-only`, not `title`. A `title` tooltip is mouse-hover only: it never
          appears on keyboard focus (this badge is not focusable, and making it
          focusable would add one tab stop per table row), never on touch, and
          screen readers treat it inconsistently -- so the date it carried was
          reachable by exactly one input method. The repo's Tooltip primitive is
          the wrong tool for the same reason it is right in line-items.tsx:
          there it wraps a single warning icon, here it would repeat down a
          21-row column. */}
      {quotedDate ? (
        <span className="sr-only">, quoted {formatDate(quotedDate)}</span>
      ) : null}
    </Badge>
  );
}

/** PRD-018 — a deactivated product or component stays on quotes that already
 *  reference it, priced as-is, but is marked. */
export function DeactivatedBadge() {
  return <Badge variant="outline">Deactivated</Badge>;
}
