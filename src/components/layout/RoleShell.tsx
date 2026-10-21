import { Sidebar } from "./Sidebar";
import type { Role } from "@/types/auth";

interface RoleShellProps {
  role: Role;
  children: React.ReactNode;
}

export function RoleShell({ role, children }: RoleShellProps): React.ReactElement {
  const showSidebar = role === "CONGRESS_ADMIN" || role === "SYSTEM_ADMIN";

  if (!showSidebar) {
    return (
      <main
        className="mx-auto min-h-[calc(100vh-60px)] max-w-[var(--container-max)] px-6 py-6"
        data-testid="role-shell-content"
      >
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)]" data-testid="role-shell">
      <div
        className="sticky top-[60px] hidden h-[calc(100vh-60px)] md:flex"
        data-testid="role-shell-sidebar"
      >
        <Sidebar role={role} />
      </div>

      <main
        className="min-w-0 flex-1 overflow-auto p-6"
        data-testid="role-shell-content"
      >
        {children}
      </main>
    </div>
  );
}
