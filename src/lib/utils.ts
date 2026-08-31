import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Display formatters ------------------------------------------------------
//
// Presentation only. These format a number that has already been decided
// elsewhere; none of them brings a value into existence. Rounding rules for
// *persisted* numeric fields are a product decision and are deliberately not
// implied here — `formatMoney` rounds for display the way Intl.NumberFormat
// always has, which is not a business rule.
//
// `en-US` is pinned rather than left to the runtime locale so a server render
// and a client hydration produce identical strings. Money and quantities are
// rendered in `font-mono tabular-nums` at the call site (DESIGN-SYSTEM.md §8).

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

export function formatHours(value: number) {
  return value.toFixed(2);
}

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}
