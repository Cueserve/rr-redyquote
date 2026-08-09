"use client";

import * as React from "react";
import { ChevronDown, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The account control in the Topbar's right slot: who you are signed in as,
 * and the way out.
 *
 * WHAT IT KNOWS: two strings and two optional slots. It does **not** import
 * `@/lib/mock` or `@/components/prototype/` -- PROJECT-STRUCTURE.md §3 keeps
 * prototype scaffolding quarantined so each delete is one `rm -r` and not a
 * hunt, and nothing outside those folders may assume they exist. This is
 * permanent chrome, so it takes plain props and lets its caller decide where
 * the identity comes from. Today that caller is `PrototypeUserMenu`; after the
 * Supabase session work it is a server-read profile.
 *
 * WHY NOT THE shadcn `avatar` PRIMITIVE: Radix Avatar exists to manage an
 * image's load/error states with a fallback. `profiles` has no `avatar_url`
 * and adding one is a DATABASE.md decision that collides with the
 * branding-assets upload spec, so there is no image and never has been. The
 * primitive's entire job would be dead code. Initials are a `<span>`, local to
 * this file until something else needs them.
 *
 * SIGN OUT IS A PROP, NOT A BEHAVIOR. `onSignOut` absent means the item is
 * disabled and `signOutDisabledReason` says why, in a sentence under the
 * control rather than a tooltip -- DESIGN-SYSTEM.md §11, and also the only
 * thing that works: a disabled menu item carries `pointer-events-none`, so a
 * tooltip on it never fires. Nothing about "auth is not wired yet" lives in
 * here; the caller supplies the reason and stops supplying it once there is a
 * Server Action to call.
 */

/** First letter of the first and last name parts, so "Dana Whitfield" is DW
 *  and a single-word name is one letter rather than a blank circle. */
function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function UserMenu({
  name,
  roleLabel,
  roleSlot,
  onSignOut,
  signOutDisabledReason,
  className,
}: {
  name: string;
  /** Display form of the current role -- "Rep", "Admin". A string rather than
   *  the `UserRole` union, which lives in the prototype fixtures. */
  roleLabel: string;
  /** Extra menu rows between identity and sign out. The prototype role switch
   *  arrives here; the slot disappears with it. */
  roleSlot?: React.ReactNode;
  onSignOut?: () => void;
  /** Required in practice whenever `onSignOut` is absent: a disabled control
   *  with no stated reason is indistinguishable from a broken one. */
  signOutDisabledReason?: string;
  className?: string;
}) {
  const canSignOut = typeof onSignOut === "function";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* `ghost` already carries `aria-expanded:bg-accent`, so the trigger
            holds its hover surface while the menu is open with no extra state.
            The accessible name contains the visible name, which is what WCAG
            2.5.3 asks for -- and it keeps working at the narrow width where the
            name itself is hidden. */}
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Account menu for ${name}`}
          className={cn("gap-2 pl-1.5", className)}
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
          >
            {initialsFrom(name)}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 transition-transform duration-150 ease-out group-aria-expanded/button:rotate-180"
          />
        </Button>
      </DropdownMenuTrigger>

      {/* `w-60` overrides the primitive's default
          `w-(--radix-dropdown-menu-trigger-width)`, which sizes a menu to its
          trigger the way a Select does. Right for a Select, wrong here: the
          trigger is a compact icon-and-name button and the identity block
          under it is the widest thing in the menu. `align="end"` keeps it
          inside the viewport at the right edge of the bar. */}
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-1.5 py-1.5">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          {/* Role is stated here as well as in whatever `roleSlot` renders.
              That is deliberate: both read the same value so they cannot
              disagree, and this is the line that survives when the prototype
              switch is deleted. Drop it and role vanishes from the menu at
              auth wiring. */}
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>

        {roleSlot ? (
          <>
            <DropdownMenuSeparator />
            {roleSlot}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!canSignOut} onSelect={onSignOut}>
          <LogOut aria-hidden="true" className="size-3.5" />
          Sign out
        </DropdownMenuItem>
        {!canSignOut && signOutDisabledReason ? (
          <p className="px-1.5 pt-0.5 pb-1 text-xs text-muted-foreground">
            {signOutDisabledReason}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserMenu };
