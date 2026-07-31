import * as React from "react";

import { cn } from "@/lib/utils";

// The design system's Sidebar (§7.17): 220px dark rail (--sidebar, stone-900),
// white logo chip (the REDYREF logo isn't transparent-safe on dark), active
// item filled --sidebar-primary (brand red), inactive items --sidebar-
// foreground. Not `ui/` -- chrome, not a shared atom, and allowed to be
// app-aware (current route) in a way ui/ components structurally can't be
// (see eslint.config.mjs's ui/ boundary rule).
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
        "flex h-full w-55 flex-col gap-0.5 bg-sidebar p-3 text-sidebar-foreground",
        className,
      )}
    >
      {logo ? (
        <div className="mx-2.5 mb-5 w-fit rounded-md bg-sidebar-logo-chip p-2">
          {logo}
        </div>
      ) : null}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                isActive
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export { Sidebar };
