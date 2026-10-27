import { TransportShell } from "@/components/layout/TransportShell";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireTransportPageAccess("CUSTOMER");
  return <TransportShell>{children}</TransportShell>;
}
