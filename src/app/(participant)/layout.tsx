import { NavBar } from "@/components/layout/NavBar";
import { RoleShell } from "@/components/layout/RoleShell";
import { requireRole } from "@/lib/auth/guards";

interface ParticipantLayoutProps {
  children: React.ReactNode;
}

export default async function ParticipantLayout({
  children,
}: ParticipantLayoutProps): Promise<React.ReactElement> {
  await requireRole("PARTICIPANT");

  return (
    <div>
      <NavBar />
      <RoleShell role="PARTICIPANT">{children}</RoleShell>
    </div>
  );
}
