import type { Database } from "@/lib/supabase/types";

export type QuoteStatus = Database["public"]["Enums"]["quote_status"];

/** Display labels for the four lifecycle states (DESIGN-SYSTEM.md §11). */
export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  pending_approval: "Review",
  approved: "Approved",
  sent: "Sent",
};

/** Display order for status filters and tabs — matches the lifecycle in
 *  docs/ARCHITECTURE.md §3, not alphabetical. */
export const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
];
