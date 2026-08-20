import { redirect } from "next/navigation";

/**
 * Entry route. Real behaviour once auth is wired: read the session and send the
 * user to `/quotes` or `/login`. Until then it always lands on the app, since
 * `(app)/layout.tsx` has no session gate yet.
 *
 * This file previously held a design-token reference surface, kept only until
 * the first real route existed. That trigger fired on 2026-07-31.
 */
export default function RootPage() {
  redirect("/quotes");
}
