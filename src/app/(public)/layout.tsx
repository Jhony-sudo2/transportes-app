import { TransportShell } from "@/components/layout/TransportShell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <TransportShell>{children}</TransportShell>;
}
