"use client";

import * as React from "react";

/**
 * A simplified RoleProvider that passes down the role from the server session.
 */

type UserRole = "rep" | "admin";

interface RoleContextValue {
  role: UserRole;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

export function RoleProvider({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const value = React.useMemo(() => ({ role }), [role]);

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
