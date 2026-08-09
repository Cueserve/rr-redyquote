import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** One step in the breadcrumb trail. `href` is what makes it navigable; a crumb
 *  without one renders as plain text. The **last** crumb is always plain text
 *  regardless — it is the page you are already on, so linking it is a no-op that
 *  a screen reader still announces as a destination. Callers may pass an `href`
 *  on it; Topbar ignores it. */
type Crumb = { label: string; href?: string };

// The design system's Topbar (§7.18): breadcrumb-style crumbs, right-aligned
// action slot, --border-default bottom rule. Not `ui/` for the same reason as
// Sidebar -- see the comment there.
//
// The trail is a real `<nav><ol>` with links, not styled `<span>`s. It used to
// be the latter, which looked navigable and was not -- the worst of both, since
// it also announced as flat text with no structure and no way back up. `<ol>`
// is what carries "step 2 of 3" to a screen reader, and `aria-label` is what
// distinguishes this nav landmark from the rail's (both are landmarks; two
// unlabelled ones are indistinguishable in a landmark list).
function Topbar({
  crumbs,
  right,
  className,
}: {
  crumbs: Crumb[];
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="topbar"
      className={cn(
        "flex items-center justify-between border-b border-border bg-card px-7 py-4",
        className,
      )}
    >
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              // Keyed on label *and* index: two crumbs can legitimately carry
              // the same label (a product named "Settings", say), and a
              // duplicate key silently drops one from the trail.
              <li
                key={`${crumb.label}-${index}`}
                className="flex items-center gap-1"
              >
                {index > 0 ? (
                  // Decoration. Without `aria-hidden` the trail reads as
                  // "Home slash Quotes slash Q-1043"; the `<ol>` already
                  // conveys the nesting.
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                ) : null}
                {isLast || !crumb.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      isLast
                        ? "font-semibold text-foreground"
                        : "font-normal text-muted-foreground",
                    )}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  // Overrides the base-layer anchor color from globals.css: a
                  // trail of clay links competes with the page's one primary
                  // action. The underline on hover comes from that same base
                  // rule and is left alone -- it is the affordance that says
                  // this one is clickable and the last one is not.
                  <Link
                    href={crumb.href}
                    className="font-normal text-muted-foreground hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export { Topbar, type Crumb };
