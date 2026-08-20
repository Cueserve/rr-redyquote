/**
 * PROTOTYPE ONLY — delete when the real read path lands.
 *
 * Lookup helpers over the fixtures in `./data`. These are array finds standing
 * in for what a Server Component's Supabase select would return — no derivation,
 * no calculation, no rules. Anything that would qualify as logic (pricing,
 * freshness derivation, transition validity) is deliberately absent: it belongs
 * in `src/lib/pricing/` and the Server Actions, neither of which exists yet.
 */

import {
  CATEGORIES,
  COMPONENTS,
  FAB_TIERS,
  PRICE_HISTORY,
  PRODUCTS,
  PRODUCT_DEFAULTS,
  PROFILES,
  QUOTES,
  QUOTE_LINES,
  QUOTE_STATUS_HISTORY,
} from "./data";
import type { QuoteStatus } from "./types";

export * from "./types";
export {
  CATEGORIES,
  COMPONENTS,
  CURRENT_USER,
  FAB_TIERS,
  PRICE_HISTORY,
  PRODUCTS,
  PRODUCT_DEFAULTS,
  PROFILES,
  QUOTES,
  QUOTE_LINES,
  QUOTE_STATUS_HISTORY,
  SETTINGS,
  SETTINGS_HISTORY,
  TODAY,
} from "./data";

export function getQuote(id: string) {
  return QUOTES.find((q) => q.id === id);
}

export function getQuoteLines(quoteId: string) {
  return QUOTE_LINES[quoteId] ?? [];
}

export function getQuoteHistory(quoteId: string) {
  return QUOTE_STATUS_HISTORY[quoteId] ?? [];
}

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

export function getFabTiers(productId: string) {
  return FAB_TIERS.filter((t) => t.product_id === productId).sort(
    (a, b) => a.qty_tier - b.qty_tier,
  );
}

export function getProductDefaults(productId: string) {
  return PRODUCT_DEFAULTS[productId] ?? [];
}

export function getComponent(id: string) {
  return COMPONENTS.find((c) => c.id === id);
}

export function getComponentsByCategory(categoryId: string) {
  return COMPONENTS.filter((c) => c.category_id === categoryId);
}

export function getPriceHistory(componentId: string) {
  return PRICE_HISTORY[componentId] ?? [];
}

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

export function getProfile(id: string) {
  return PROFILES.find((p) => p.id === id);
}

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
