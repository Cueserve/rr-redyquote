"use client";

import { FlaskConical } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/mock";

import { useRole } from "./role-context";

/**
 * PROTOTYPE ONLY — delete with the rest of `src/components/prototype/`.
 *
 * Deliberately labelled and iconed as a test affordance rather than styled to
 * blend in: nobody reviewing a screenshot should mistake it for a shipping
 * control. Uses the neutral outline treatment, never the brand fill — the one
 * clay action per screen is reserved for the page's real primary action
 * (DESIGN-SYSTEM.md §6).
 */
export function RoleToggle() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger className="text-xs font-semibold text-muted-foreground">
          <FlaskConical className="size-3.5" aria-hidden="true" />
          Prototype
        </TooltipTrigger>
        <TooltipContent>
          Design prototype. Switching role changes which affordances are shown —
          it is not access control, which is enforced by Postgres RLS.
        </TooltipContent>
      </Tooltip>
      <Select value={role} onValueChange={(next) => setRole(next as UserRole)}>
        <SelectTrigger size="sm" aria-label="Prototype role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rep">Viewing as rep</SelectItem>
          <SelectItem value="admin">Viewing as admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
