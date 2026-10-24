"use client";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FleetField } from "./FleetField";
import { DriverRegistrationStatus } from "./DriverRegistrationStatus";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
import {
  CreateDriverSchema,
  CreatedDriverSchema,
  driverPhotoError,
  type DriverFormData,
  type CreatedDriver,
  type DriverOperationReference,
} from "@/lib/validators/fleet-resources";
import { useEffect } from "react";
import { LicenseTypeListSchema } from "@/lib/validators/fleet-resources";
const fields: {
  name: FieldPath<DriverFormData>;
  label: string;
  type?: string;
  maxLength?: number;
  numeric?: boolean;
  wide?: boolean;
  autoComplete?: string;
}[] = [
  { name: "name", label: "Nombre", maxLength: 255, autoComplete: "given-name" },
  { name: "lastName", label: "Apellido", maxLength: 255, autoComplete: "family-name" },
  { name: "dpi", label: "DPI", maxLength: 50 },
  { name: "nit", label: "NIT", maxLength: 50 },
  { name: "phone", label: "Teléfono", type: "tel", maxLength: 20, autoComplete: "tel" },
  {
    name: "email",
    label: "Correo electrónico",
    type: "email",
    maxLength: 255,
    autoComplete: "email",
  },
  {
    name: "adress",
    label: "Dirección",
    maxLength: 100,
    wide: true,
    autoComplete: "street-address",
  },
  { name: "baseSalary", label: "Salario base (Q)", numeric: true, type: "number" },
  { name: "license.number", label: "Número de licencia", maxLength: 255 },
  { name: "license.expirationDate", label: "Vencimiento de la licencia", type: "date" },
];
export function CreateDriverForm({
  branch,
  initialOperation,
}: {
  branch: { id: number; name: string };
  initialOperation: DriverOperationReference | null;
}) {
  const { busy, setBusy } = useBranchWorkspace();
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");
  const [retryTypes, setRetryTypes] = useState(0);
  const [reference, setReference] = useState<DriverOperationReference | null>(initialOperation);
  const [created, setCreated] = useState<CreatedDriver | null>(null);
  const { register, handleSubmit, getFieldState, formState, reset } = useForm<DriverFormData>({
    resolver: zodResolver(CreateDriverSchema),
    defaultValues: { branchId: branch.id },
  });
  useEffect(() => {
    if (reference || created) return;
    const controller = new AbortController();
    setTypesLoading(true);
    setTypesError("");
    void (async () => {
      try {
        const parsed = LicenseTypeListSchema.safeParse(
          await readFleetResponse(
            await fetch("/api/branch-admin/license-types", { signal: controller.signal }),
          ),
        );
        if (!parsed.success) throw new Error("No se pudo cargar el catálogo de licencias.");
        if (!parsed.data.length) throw new Error("No hay tipos de licencia disponibles.");
        if (!controller.signal.aborted) setTypes(parsed.data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setTypesError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las licencias.",
          );
      } finally {
        if (!controller.signal.aborted) setTypesLoading(false);
      }
    })();
    return () => controller.abort();
  }, [reference, created, retryTypes]);
  function setOperationUrl(operation: DriverOperationReference | null) {
    const url = new URL(window.location.href);
    for (const key of ["driverId", "operationId", "branchId"]) url.searchParams.delete(key);
    if (operation)
      for (const [key, value] of Object.entries(operation))
        url.searchParams.set(key, String(value));
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  function newDriver() {
    setReference(null);
    setCreated(null);
    setPhoto(null);
    setPhotoError("");
    setError("");
    reset({
      branchId: branch.id,
      name: "",
      lastName: "",
      dpi: "",
      nit: "",
      phone: "",
      email: "",
      adress: "",
      baseSalary: Number.NaN,
      license: { number: "", expirationDate: "", licenseType: Number.NaN },
    });
    setOperationUrl(null);
  }
  async function submit(data: DriverFormData) {
    const photoIssue = driverPhotoError(photo);
    setPhotoError(photoIssue ?? "");
    if (photoIssue || !photo) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append(
        "request",
        new Blob([JSON.stringify(data)], { type: "application/json" }),
        "request.json",
      );
      body.append("photo", photo);
      const response = await readFleetResponse(
        await fetch("/api/branch-admin/drivers", { method: "POST", body }),
      );
      const parsed = CreatedDriverSchema.safeParse(
        response && typeof response === "object" && "driver" in response ? response.driver : null,
      );
      if (!parsed.success)
        throw new Error(
          "No se pudo confirmar el registro. Verifica si el chofer existe antes de repetirlo.",
        );
      setCreated(parsed.data);
      if (parsed.data.pendingOperationId) {
        const operation = {
          driverId: parsed.data.id,
          operationId: parsed.data.pendingOperationId,
          branchId: branch.id,
        };
        setReference(operation);
        setOperationUrl(operation);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo confirmar el registro del chofer.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (reference) return <DriverRegistrationStatus reference={reference} onNew={newDriver} />;
  if (created)
    return (
      <section className="space-y-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7">
        <h2 className="text-2xl font-semibold">
          {created.status === "ACCOUNT_REJECTED" ? "Registro rechazado" : "Chofer registrado"}
        </h2>
        <p role="status">
          {created.name} {created.lastName}:{" "}
          {created.status === "ACCOUNT_REJECTED"
            ? "no se pudo confirmar su cuenta."
            : "su cuenta fue confirmada."}
        </p>
        {created.failureReason && <p role="alert">{created.failureReason}</p>}
        <Button type="button" onClick={newDriver}>
          Registrar otro chofer
        </Button>
      </section>
    );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
          <UserRoundPlus size={23} className="text-[var(--tg-green)]" aria-hidden="true" />
          Crear chofer
        </h2>
        <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
          <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.wide ? "sm:col-span-2" : ""}>
                <FleetField
                  id={"driver-" + field.name.replace(".", "-")}
                  label={field.label}
                  type={field.type ?? "text"}
                  step={field.numeric ? ".01" : undefined}
                  min={field.numeric ? ".01" : undefined}
                  maxLength={field.maxLength}
                  autoComplete={field.autoComplete ?? "off"}
                  required
                  error={getFieldState(field.name, formState).error}
                  {...register(field.name, field.numeric ? { valueAsNumber: true } : {})}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="driver-license-type">Tipo de licencia</Label>
              <select
                id="driver-license-type"
                disabled={busy || typesLoading || !!typesError}
                required
                aria-invalid={!!formState.errors.license?.licenseType}
                className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm disabled:opacity-60"
                {...register("license.licenseType", { valueAsNumber: true })}
              >
                <option value="">
                  {typesLoading ? "Cargando licencias…" : "Selecciona un tipo"}
                </option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {formState.errors.license?.licenseType && (
                <p role="alert" className="text-xs text-red-600">
                  {formState.errors.license.licenseType.message}
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="driver-photo">Fotografía del chofer</Label>
              <Input
                id="driver-photo"
                type="file"
                accept="image/jpeg,image/png"
                required
                aria-invalid={!!photoError}
                aria-describedby="driver-photo-help"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPhoto(file);
                  setPhotoError(driverPhotoError(file) ?? "");
                }}
              />
              <p id="driver-photo-help" className="text-xs text-[var(--tg-muted)]">
                JPG o PNG, hasta 1 MB.
              </p>
              {photoError && (
                <p role="alert" className="text-xs text-red-600">
                  {photoError}
                </p>
              )}
            </div>
          </fieldset>
          {typesError && (
            <div
              role="alert"
              className="mt-5 space-y-3 rounded-lg border border-red-300 p-4 text-sm"
            >
              <p>{typesError}</p>
              <Button
                type="button"
                variant="outline"
                disabled={busy || typesLoading}
                onClick={() => setRetryTypes((value) => value + 1)}
              >
                Reintentar licencias
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-lg border border-red-300 p-4 text-sm">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || typesLoading || !!typesError || !types.length}
            className="mt-7 w-full sm:w-auto"
          >
            {busy ? "Registrando chofer…" : "Crear chofer"}
          </Button>
        </form>
      </section>
      <aside className="rounded-2xl bg-[#16383e] p-6 text-[#eef6ed]">
        <h2 className="text-lg font-semibold">Un registro para tu sucursal</h2>
        <p className="mt-3 text-sm leading-7 text-[#b9d2bc]">
          El chofer quedará asociado a {branch.name}. Registra su licencia y el correo que usará
          para acceder.
        </p>
        <p className="mt-5 border-t border-white/15 pt-5 text-xs leading-6 text-[#b9d2bc]">
          Al enviar la solicitud podrás consultar su confirmación. El registro queda en proceso
          hasta que se confirme la cuenta.
        </p>
      </aside>
    </div>
  );
}
