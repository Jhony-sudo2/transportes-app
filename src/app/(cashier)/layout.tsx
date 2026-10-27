import { TransportShell } from "@/components/layout/TransportShell";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  await requireTransportPageAccess("CAJERO");
  return <TransportShell>{children}</TransportShell>;
}
