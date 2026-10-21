import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SystemAdminReportsClient } from "@/components/domain/SystemAdminReportsClient";

export default async function SystemAdminReportsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  return <SystemAdminReportsClient />;
}
