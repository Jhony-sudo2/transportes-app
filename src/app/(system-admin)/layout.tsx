import { TransportShell } from "@/components/layout/TransportShell";
import { requireTransportPageAccess } from "@/lib/auth/page-access";

export default async function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  await requireTransportPageAccess("ADMIN");
  return <TransportShell>{children}</TransportShell>;
}
