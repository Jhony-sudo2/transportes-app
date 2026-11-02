import { TransportShell } from "@/components/layout/TransportShell";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  await requireTransportPageAccess("DRIVER");
  return <TransportShell>{children}</TransportShell>;
}
