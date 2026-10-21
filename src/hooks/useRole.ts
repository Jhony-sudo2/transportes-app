"use client";

import type { Role } from "@/types/auth";
import { useAuth } from "./useAuth";

/**
 * Convenience hook for conditional rendering based on role.
 * This is for UI rendering only — not a security gate.
 * For security, use requireRole() in server component layouts.
 */
export function useRole(): { hasRole: (role: Role) => boolean } {
  const { session } = useAuth();

  function hasRole(role: Role): boolean {
    if (session === null) {
      return false;
    }
    return session.roles.includes(role);
  }

  return { hasRole };
}
