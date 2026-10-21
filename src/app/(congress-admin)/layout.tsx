import { NavBar } from "@/components/layout/NavBar";
import { RoleShell } from "@/components/layout/RoleShell";
import { requireRole } from "@/lib/auth/guards";

interface CongressAdminLayoutProps {
  children: React.ReactNode;
}

export default async function CongressAdminLayout({
  children,
}: CongressAdminLayoutProps): Promise<React.ReactElement> {
  await requireRole("CONGRESS_ADMIN");

  return (
    <div>
      <NavBar />
      <RoleShell role="CONGRESS_ADMIN">{children}</RoleShell>
    </div>
  );
}
