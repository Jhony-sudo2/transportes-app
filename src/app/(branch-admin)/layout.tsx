import { TransportShell } from "@/components/layout/TransportShell";
import { requireTransportPageAccess } from "@/lib/auth/page-access";

export default async function BranchAdminLayout({ children }: { children: React.ReactNode }) {
  await requireTransportPageAccess("SUCURSAL_ADMIN");
  return <TransportShell>{children}</TransportShell>;
}
