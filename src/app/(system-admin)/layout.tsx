import { NavBar } from "@/components/layout/NavBar";
import { RoleShell } from "@/components/layout/RoleShell";
import { requireRole } from "@/lib/auth/guards";

interface SystemAdminLayoutProps {
  children: React.ReactNode;
}

export default async function SystemAdminLayout({
  children,
}: SystemAdminLayoutProps): Promise<React.ReactElement> {
  await requireRole("SYSTEM_ADMIN");

  return (
    <div>
      <NavBar />
      <RoleShell role="SYSTEM_ADMIN">{children}</RoleShell>
    </div>
  );
}
