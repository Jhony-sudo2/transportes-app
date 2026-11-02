"use client";
import { AccountProfileSchema } from "@/lib/validators/account";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerDataState } from "./CustomerDataState";
export function DriverLicenseView() {
  const profile = useCustomerData("/api/account/profile", AccountProfileSchema);
  const driver = profile.data?.driver;
  return (
    <div className="space-y-5">
      <CustomerDataState loading={profile.loading} error={profile.error} retry={profile.refresh} />
      {driver && (
        <dl className="grid gap-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-[var(--tg-muted)]">Número de licencia</dt>
            <dd>{driver.number ?? "Sin informar"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--tg-muted)]">Tipo de licencia</dt>
            <dd>{driver.licenseTypeName ?? "Sin informar"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--tg-muted)]">Fecha de vencimiento</dt>
            <dd>{driver.expirationDate ?? "Sin informar"}</dd>
          </div>
        </dl>
      )}
      <p className="text-sm text-[var(--tg-muted)]">
        Para actualizar tu licencia, contacta al administrador de tu sucursal.
      </p>
    </div>
  );
}
