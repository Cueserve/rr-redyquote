"use client";

import { FlaskConical } from "lucide-react";

import { UserMenu } from "@/components/layout/user-menu";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { CURRENT_USER, type UserRole } from "@/lib/mock";

import { useRole } from "./role-context";

/**
 * PROTOTYPE ONLY — delete with the rest of `src/components/prototype/`.
 *
 * Replaces the standalone `RoleToggle` that used to sit in the Topbar's right
 * slot. Same job, one control instead of two: the role switch is now a band
 * inside the account menu rather than a separate Select competing with it for
 * the same slot. Two controls both claiming to state your role is one control
 * too many, and the pair could show different answers.
 *
 * THIS FILE IS THE SEAM. Everything that knows the prototype exists lives
 * here: the hardcoded `CURRENT_USER`, the client-side role context, and the
 * copy explaining that neither is real. `UserMenu` itself is permanent chrome
 * and imports none of it. `AppChrome` renders this one component, so auth
 * wiring is a delete plus a single swap to a real `<UserMenu>` fed from a
 * server-read profile.
 *
 * Still not authorization, for exactly the reasons in `role-context.tsx`:
 * the real role comes from `profiles.role` read server-side, and the real
 * enforcement is Postgres RLS (ARCHITECTURE.md §5, NFR-002).
 */

const ROLE_LABEL: Record<UserRole, string> = {
  rep: "Rep",
  admin: "Admin",
};

export function PrototypeUserMenu() {
  const { role, setRole } = useRole();

  return (
    <UserMenu
      name={CURRENT_USER.full_name}
      // The switched role, not `CURRENT_USER.role`. The identity line and the
      // radio group below it read the same value, so they cannot drift.
      roleLabel={ROLE_LABEL[role]}
      // No `onSignOut`: there is no `src/server/actions/` and no session to
      // end. The reason is passed rather than assumed by `UserMenu`, which
      // has no business knowing why its caller cannot sign anyone out.
      signOutDisabledReason="Sign out arrives with the Supabase session work."
      roleSlot={
        <>
          {/* Title Case for a section header, sentence case for the items
              below it (DESIGN-SYSTEM.md §11). The flask is the same marker
              `RoleToggle` carried: nobody reading a screenshot should mistake
              this band for a shipping control. */}
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <FlaskConical aria-hidden="true" className="size-3.5" />
            Prototype Role
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={role}
            onValueChange={(next) => setRole(next as UserRole)}
          >
            <DropdownMenuRadioItem value="rep">
              Viewing as rep
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="admin">
              Viewing as admin
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <p className="px-1.5 pt-0.5 pb-1 text-xs text-muted-foreground">
            Changes which affordances are shown. Not access control, which
            Postgres enforces.
          </p>
        </>
      }
    />
  );
}
