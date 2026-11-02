import { notFound } from "next/navigation";
import type { TransportUser, TransportRoleName } from "@/types/auth";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
import { getBranchWorkspace } from "@/lib/api/branch-workspace";
export async function OperationsPage({
  title,
  roles,
  children,
  branchScope = false,
}: {
  title: string;
  roles: TransportRoleName[];
  children: (access: { user: TransportUser; branchId?: number }) => React.ReactNode;
  branchScope?: boolean;
}) {
  const user = await requireTransportPageAccess();
  if (!roles.includes(user.role.name)) notFound();
  const branchId =
    branchScope && user.role.name === "SUCURSAL_ADMIN"
      ? (await getBranchWorkspace()).branchId
      : undefined;
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
      <p className="tg-eyebrow">TRANSPORTES GUATEMALA</p>
      <h1 className="text-3xl font-semibold">{title}</h1>
      {branchId === null ? (
        <p role="status" className="tg-notice">
          Selecciona una sucursal en la barra superior.
        </p>
      ) : (
        <div key={`${user.id}:${branchId ?? "global"}`}>
          {children({ user, ...(branchId === undefined ? {} : { branchId }) })}
        </div>
      )}
    </section>
  );
}
