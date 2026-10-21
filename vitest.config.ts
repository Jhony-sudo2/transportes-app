import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/hooks/**", "src/components/domain/**"],
      exclude: [
        "src/components/ui/**",
        // Server-only BFF clients and mock data — not runnable in jsdom
        "src/lib/api/**",
        // Server-only auth helpers (redirect, cookies) — require Next.js server context
        "src/lib/auth/cookies.ts",
        "src/lib/auth/guards.ts",
        // Complex page-level components — covered by E2E, not unit tests
        "src/components/domain/*PageClient.tsx",
        "src/components/domain/*Dialog.tsx",
        "src/components/domain/*Form*.tsx",
        "src/components/domain/CongressFilters.tsx",
        "src/components/domain/CongressActions.tsx",
        "src/components/domain/CancelReservationButton.tsx",
        "src/components/domain/ReserveActivityButton.tsx",
        // Context-dependent hooks — tested via E2E
        "src/hooks/useAuth.ts",
        "src/hooks/useToast.ts",
      ],
      thresholds: {
        lines: 80,
      },
    },
    server: {
      deps: {
        // Inline server-only so it can be mocked in tests
        inline: ["server-only"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Mock server-only in test environment
      "server-only": path.resolve(__dirname, "tests/unit/__mocks__/server-only.ts"),
    },
  },
});
