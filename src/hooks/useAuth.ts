"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserSchema } from "@/lib/validators/user";
import type { UserData } from "@/lib/validators/user";

interface UseAuthResult {
  session: UserData | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

/**
 * Client-side hook for accessing the current session.
 * Reads from /api/users/me to get the current user profile.
 * For security decisions, always use requireRole() in server layouts.
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadSession(): Promise<void> {
      try {
        const response = await fetch("/api/users/me");
        if (!response.ok) {
          if (!cancelled) setSession(null);
          return;
        }
        const data: unknown = await response.json();
        const parsed = UserSchema.safeParse(data);
        if (!cancelled) {
          setSession(parsed.success ? parsed.data : null);
        }
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut(): Promise<void> {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSession(null);
      router.push("/login");
      router.refresh();
    }
  }

  return { session, isLoading, signOut };
}
