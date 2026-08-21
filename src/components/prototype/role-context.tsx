"use client";

import * as React from "react";

import type { UserRole } from "@/lib/mock";

/**
 * PROTOTYPE ONLY - delete when Supabase Auth wiring lands.
 *
 * A client-side role switch so both halves of the two-role model (PRD-019) can
 * be reviewed without provisioning two accounts. It exists to make the DESIGN
 * legible, and it is not, at any point, an authorization mechanism:
 *
 *   - The real role comes from `profiles.role`, read server-side.
 *   - The real enforcement is Postgres RLS (ARCHITECTURE.md A 5, NFR-002).
 *     Hiding a button is not access control - PRODUCT.md A 6 names this as an
 *     anti-pattern by name.
 *
 * So everything downstream of this context is presentation: which affordances
 * a user is *offered*, never which writes are *permitted*. When real auth
 * lands, `useRole()` is replaced by a server-read role passed down as a prop,
 * and this whole folder goes away.
 */

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

export function RoleProvider({
  children,
  initialRole = "rep",
}: {
  children: React.ReactNode;
  initialRole?: UserRole;
}) {
  const value = React.useMemo(
    () => ({ role: initialRole, setRole: () => {} }),
    [initialRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = React.useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

export function useIsAdmin() {
  return useRole().role === "admin";
}
