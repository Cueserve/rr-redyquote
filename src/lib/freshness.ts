import { differenceInMonths } from "date-fns";

export type Freshness = "current" | "aging" | "requote";

export function deriveFreshness(
  quotedDate: string,
  warningMonths: number,
  requoteMonths: number,
): Freshness {
  const diff = differenceInMonths(new Date(), new Date(quotedDate));

  if (diff >= requoteMonths) {
    return "requote";
  } else if (diff >= warningMonths) {
    return "aging";
  } else {
    return "current";
  }
}
