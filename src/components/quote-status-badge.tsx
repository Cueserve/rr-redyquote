import { Badge } from "@/components/ui/badge";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/mock";

/**
 * The quote-lifecycle → Badge mapping (PRD-010). It lives here rather than in
 * `src/components/ui/badge.tsx` on purpose: `ui/` must stay app-agnostic — it
 * knows `success` / `warning` / `info`, never "Pending approval"
 * (DESIGN-SYSTEM.md §13.4, enforced by the `ui/` boundary rule in
 * eslint.config.mjs).
 *
 * Tone assignment follows the lifecycle, not severity: warning marks the state
 * that is *waiting on someone* rather than a problem, and `sent` is info rather
 * than success because success already means "approved".
 */
const STATUS_VARIANT: Record<
  QuoteStatus,
  "secondary" | "warning" | "success" | "info"
> = {
  draft: "secondary",
  pending_approval: "warning",
  approved: "success",
  sent: "info",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} dot>
      {QUOTE_STATUS_LABEL[status]}
    </Badge>
  );
}
