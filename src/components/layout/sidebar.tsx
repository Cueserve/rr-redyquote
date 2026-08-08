import * as React from "react";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// The design system's Sidebar (§7.17): 220px dark rail (--sidebar, stone-900),
// white logo chip (the REDYREF logo isn't transparent-safe on dark), active
// item filled --sidebar-primary (brand red), inactive items --sidebar-
// foreground. Not `ui/` -- chrome, not a shared atom, and allowed to be
// app-aware (current route) in a way ui/ components structurally can't be
// (see eslint.config.mjs's ui/ boundary rule).
//
// Below `xl` the rail collapses to icons (DESIGN-SYSTEM.md §9). A fixed 220px
// rail is 29% of a 768px tablet, which cost the quotes table 297px of its 787px
// of columns; the collapse hands 152px of that back. Supported range starts at
// tablet, so there is no phone drawer here and no hamburger.
//
// `xl` and not `lg`, which is counterintuitive enough to record: a two-width
// rail always shrinks the content area at the width where it expands, so the
// step gets placed, not removed. At `lg` it fell at 1024 and clipped 41px off
// the quotes table. At `xl` the same step falls at 1280, where 1060px of
// content still clears the 787px table (DESIGN-SYSTEM.md §9).
export interface SidebarNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

function Sidebar({
  items,
  activeHref,
  logo,
  className,
}: {
  items: SidebarNavItem[];
  activeHref?: string;
  logo?: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "flex h-full w-16 flex-col gap-0.5 bg-sidebar p-3 text-sidebar-foreground xl:w-55",
        className,
      )}
    >
      {/* The wordmark is the only brand asset there is, and it is illegible at
          40px of usable width. Below `xl` the chip drops rather than shrinking
          into mush or inventing a monogram the brand doesn't have -- the Topbar
          breadcrumb still says where you are. */}
      {logo ? (
        <div className="mx-2.5 mb-5 hidden w-fit rounded-md bg-sidebar-logo-chip p-2 xl:block">
          {logo}
        </div>
      ) : null}
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Tooltip key={item.href}>
              {/* `asChild` is correct here and only here: Link already renders
                  a focusable anchor, so the trigger has a real element to
                  attach to (see the note in ui/tooltip.tsx). */}
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors max-xl:justify-center max-xl:px-0 max-xl:py-3",
                    isActive
                      ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {item.icon}
                  {/* Hidden, not removed: the collapsed rail still needs an
                      accessible name for every destination. */}
                  <span className="max-xl:sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              {/* Earns its place only while the label is hidden. */}
              <TooltipContent side="right" className="xl:hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}

export { Sidebar };
