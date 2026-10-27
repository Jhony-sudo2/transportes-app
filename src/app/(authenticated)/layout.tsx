import { TransportShell } from "@/components/layout/TransportShell";
import { requireTransportPageAccess } from "@/lib/auth/page-access";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  await requireTransportPageAccess();
  return <TransportShell>{children}</TransportShell>;
}
