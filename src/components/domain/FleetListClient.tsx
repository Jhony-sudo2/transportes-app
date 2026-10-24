"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FleetRecordsList } from "./FleetRecordsList";
import type { Column } from "./ReportTable";
import {
  BusListSchema,
  DriverListSchema,
  DriverOperationIdSchema,
  type BusListRecord,
  type DriverListRecord,
} from "@/lib/validators/fleet-resources";
const number = new Intl.NumberFormat("es-GT");
const salary = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" });
const displayNumber = (value: number | null | undefined) =>
  value == null ? "—" : number.format(value);
const displayDate = (value: string | null | undefined) => {
  const date = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return date ? `${date[3]}/${date[2]}/${date[1]}` : "—";
};
const busStatuses: Record<string, string> = {
  AVAILABLE: "Disponible",
  IN_SERVICE: "En servicio",
  OUT_OF_SERVICE: "Fuera de servicio",
  UNKNOWN: "Sin estado",
};
const driverStatuses: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  PENDING: "Pendiente de confirmación",
  ACCOUNT_REJECTED: "Registro rechazado",
  UNKNOWN: "Sin estado",
};
const busStatus = (bus: BusListRecord) => bus.state || "UNKNOWN";
const driverStatus = (driver: DriverListRecord) =>
  driver.status ?? (driver.active ? "ACTIVE" : "UNKNOWN");
const busSearch = (bus: BusListRecord) =>
  [bus.plateNumber, bus.brand, bus.model, bus.yearManufacture].join(" ");
const driverSearch = (driver: DriverListRecord) =>
  [
    driver.name,
    driver.lastName,
    driver.email,
    driver.phone,
    driver.number,
    driver.licenseTypeName,
  ].join(" ");
function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const color = ["ACTIVE", "AVAILABLE"].includes(status)
    ? "border-emerald-600/30 bg-emerald-600/10 text-[var(--tg-green)]"
    : status === "ACCOUNT_REJECTED"
      ? "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300"
      : status === "PENDING"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
        : "border-[var(--tg-line)] bg-[var(--color-surface)] text-[var(--tg-muted)]";
  return (
    <span className={"inline-flex rounded-full border px-3 py-1 text-xs font-semibold " + color}>
      {labels[status] ?? status}
    </span>
  );
}
const busColumns: Column<BusListRecord>[] = [
  {
    key: "plateNumber",
    header: "Placa",
    render: (_value, bus) => <span className="font-semibold">{bus.plateNumber}</span>,
  },
  {
    key: "brand",
    header: "Vehículo",
    render: (_value, bus) => (
      <div className="min-w-32">
        <p>{bus.brand}</p>
        <p className="mt-1 text-xs text-[var(--tg-muted)]">
          Modelo {bus.model} · Fabricación {bus.yearManufacture ?? "—"}
        </p>
      </div>
    ),
  },
  {
    key: "capacity",
    header: "Asientos",
    render: (_value, bus) => (
      <div>
        <p>{displayNumber(bus.capacity)}</p>
        <p className="mt-1 text-xs text-[var(--tg-muted)]">
          {bus.seatRows ?? "—"} filas × {bus.seatColumns ?? "—"} columnas
        </p>
      </div>
    ),
  },
  {
    key: "currentKm",
    header: "Kilometraje",
    render: (_value, bus) => displayNumber(bus.currentKm) + (bus.currentKm == null ? "" : " km"),
  },
  {
    key: "state",
    header: "Estado",
    render: (_value, bus) => <StatusBadge status={busStatus(bus)} labels={busStatuses} />,
  },
];
function DriverList({ branch }: { branch: { id: number; name: string } }) {
  const columns: Column<DriverListRecord>[] = [
    {
      key: "name",
      header: "Chofer",
      render: (_value, driver) => (
        <div className="min-w-40">
          <p className="font-semibold">
            {driver.name} {driver.lastName}
          </p>
          <p className="mt-1 max-w-60 break-words text-xs text-[var(--tg-muted)]">
            {driver.email || "Sin correo"}
          </p>
        </div>
      ),
    },
    { key: "phone", header: "Teléfono", render: (_value, driver) => driver.phone || "—" },
    {
      key: "number",
      header: "Licencia",
      render: (_value, driver) => (
        <div className="min-w-36">
          <p>
            {driver.number || "—"}
            {driver.licenseTypeName ? " · " + driver.licenseTypeName : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--tg-muted)]">
            Vence: {displayDate(driver.expirationDate)}
          </p>
        </div>
      ),
    },
    {
      key: "baseSalary",
      header: "Salario base",
      render: (_value, driver) =>
        driver.baseSalary == null ? "—" : salary.format(driver.baseSalary),
    },
    {
      key: "status",
      header: "Estado",
      render: (_value, driver) => (
        <div className="space-y-2">
          <StatusBadge status={driverStatus(driver)} labels={driverStatuses} />
          {driver.failureReason && (
            <p className="max-w-64 break-words text-xs text-[var(--tg-muted)]">
              {driver.failureReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "pendingOperationId",
      header: "Seguimiento",
      render: (_value, driver) =>
        driver.status === "PENDING" &&
        DriverOperationIdSchema.safeParse(driver.pendingOperationId).success ? (
          <Button asChild size="sm" variant="outline">
            <Link
              aria-label={`Ver estado de ${driver.name} ${driver.lastName}`}
              href={`/sucursal/choferes/nuevo?driverId=${driver.id}&operationId=${driver.pendingOperationId}&branchId=${branch.id}`}
            >
              Ver estado
            </Link>
          </Button>
        ) : (
          <span className="text-[var(--tg-muted)]">—</span>
        ),
    },
  ];
  return (
    <FleetRecordsList
      branchId={branch.id}
      resource="drivers"
      schema={DriverListSchema}
      columns={columns}
      caption={"Choferes de " + branch.name}
      emptyMessage="Aún no hay choferes registrados en esta sucursal."
      searchLabel="Buscar por nombre, correo o licencia"
      searchText={driverSearch}
      recordStatus={driverStatus}
      statusLabels={driverStatuses}
    />
  );
}
export function FleetListClient({
  kind,
  branch,
}: {
  kind: "bus" | "driver";
  branch: { id: number; name: string };
}) {
  return kind === "bus" ? (
    <FleetRecordsList
      branchId={branch.id}
      resource="buses"
      schema={BusListSchema}
      columns={busColumns}
      caption={"Buses de " + branch.name}
      emptyMessage="Aún no hay buses registrados en esta sucursal."
      searchLabel="Buscar por placa, marca o modelo"
      searchText={busSearch}
      recordStatus={busStatus}
      statusLabels={busStatuses}
    />
  ) : (
    <DriverList branch={branch} />
  );
}
