import { Badge } from "@/components/ui/badge";
import type { Freshness } from "@/lib/freshness";

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

// The badge renders its state and nothing else — no `quotedDate` prop, and in
// particular no hidden copy of the date.
//
// It used to carry one as a `title`, which was reachable only by mouse hover:
// not on keyboard focus (the badge is not focusable, and making it focusable
// would add a tab stop per table row), not on touch, and inconsistently by
// screen readers. Swapping that for an `sr-only` span inverted the problem
// rather than solving it — the date became screen-reader-only, and sighted
// users lost it.
//
// The real answer is that the date belongs beside the badge as ordinary visible
// text, which is what every caller now does. That also drops the last reason
// for a `position: absolute` element in here: `sr-only` is absolutely
// positioned, and impeccable's `clipped-overflow-container` flags any such
// child of the app shell's `overflow-hidden`. The finding is a false positive
// on `sr-only` — clipping is the entire point of it — but the fix that removes
// the hidden text also removes the finding, which beats suppressing a detector
// that catches real popover clipping.
//
// WCAG 1.4.1 is satisfied without the date: the state is carried by the word
// ("Current" / "Aging" / "Re-quote"), never by color alone.
export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const { label, variant } = FRESHNESS[freshness];

  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

/** PRD-018 — a deactivated product or component stays on quotes that already
 *  reference it, priced as-is, but is marked. */
export function DeactivatedBadge() {
  return <Badge variant="outline">Deactivated</Badge>;
}
