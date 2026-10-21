import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SystemConfigSchema } from "@/lib/validators/system-config";
import { PageHeader } from "@/components/ui/page-header";
import { CommissionForm } from "@/components/domain/CommissionForm";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function SystemConfigPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/system/config`, { cache: "no-store" });

  // Only redirect if the BFF itself has no session (cookie absent/invalid).
  // A 401 from the downstream wallet service uses the fallback default instead of redirecting.
  if (res.status === 401 && session === null) {
    redirect("/login");
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    raw = {};
  }
  const parsed = SystemConfigSchema.safeParse(raw);
  const currentPercent = parsed.success ? parsed.data.commissionPercent : 10;

  return (
    <div data-testid="system-admin-config-page" className="flex flex-col gap-6">
      <PageHeader
        title="Configuracion del sistema"
        description="Ajusta los parametros globales de la plataforma."
      />
      <CommissionForm currentPercent={currentPercent} />
    </div>
  );
}
