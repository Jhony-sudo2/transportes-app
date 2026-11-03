"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoundPlus, Mail, CircleCheck, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import {
  CreateAdminUserSchema,
  AdminRoleListSchema,
  CreatedAdminUserSchema,
  ADMIN_ROLE_LABELS,
} from "@/lib/validators/admin-user";
import type { CreateAdminUser, AdminRole, CreatedAdminUser } from "@/types/admin-user";
import { useCustomerData } from "@/hooks/useCustomerData";
import { BranchListSchema } from "@/lib/validators/branch";
const fields: {
  name: FieldPath<CreateAdminUser>;
  label: string;
  type: string;
  maxLength: number;
  autoComplete: string;
}[] = [
  {
    name: "person.name",
    label: "Nombre",
    type: "text",
    maxLength: 255,
    autoComplete: "given-name",
  },
  {
    name: "person.lastName",
    label: "Apellido",
    type: "text",
    maxLength: 255,
    autoComplete: "family-name",
  },
  { name: "person.dpi", label: "DPI", type: "text", maxLength: 50, autoComplete: "off" },
  { name: "person.nit", label: "NIT", type: "text", maxLength: 50, autoComplete: "off" },
  { name: "person.phone", label: "Teléfono", type: "tel", maxLength: 20, autoComplete: "tel" },
  {
    name: "person.adress",
    label: "Dirección",
    type: "text",
    maxLength: 100,
    autoComplete: "street-address",
  },
  {
    name: "email",
    label: "Correo electrónico",
    type: "email",
    maxLength: 254,
    autoComplete: "email",
  },
];
export function CreateUserForm({
  cashierBranch,
}: {
  cashierBranch?: { id: number; name: string };
}) {
  const cashier = Boolean(cashierBranch);
  const workspace = useBranchWorkspace();
  const active = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [roles, setRoles] = useState<AdminRole[]>(cashier ? [{ id: 5, name: "CAJERO" }] : []);
  const [loadingRoles, setLoadingRoles] = useState(!cashier);
  const [rolesError, setRolesError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAdminUser | null>(null);
  const branches = useCustomerData("/api/admin/branches", BranchListSchema);
  const { register, handleSubmit, getFieldState, formState, reset, watch, setValue } =
    useForm<CreateAdminUser>({
      resolver: zodResolver(CreateAdminUserSchema),
      defaultValues: {
        person: { name: "", lastName: "", dpi: "", nit: "", phone: "", adress: "" },
        email: "",
        branchIds: [],
        ...(cashier ? { roleId: 5 } : {}),
      },
    });
  const roleId = watch("roleId");
  const branchIds = watch("branchIds") ?? [];
  const loadRoles = useCallback(async (signal?: AbortSignal) => {
    setLoadingRoles(true);
    setRolesError("");
    try {
      const response = await fetch("/api/admin/roles", signal ? { signal } : {});
      const body: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          body && typeof body === "object" && "detail" in body
            ? String(body.detail)
            : "No se pudieron consultar los roles.",
        );
      const parsed = AdminRoleListSchema.parse(body);
      if (!parsed.length) throw new Error("No hay roles disponibles para crear usuarios.");
      if (!signal?.aborted) setRoles(parsed);
    } catch (cause) {
      if (!signal?.aborted) {
        setRoles([]);
        setRolesError(cause instanceof Error ? cause.message : "No se pudieron cargar los roles.");
      }
    } finally {
      if (!signal?.aborted) setLoadingRoles(false);
    }
  }, []);
  useEffect(() => {
    if (cashier) return;
    const controller = new AbortController();
    void loadRoles(controller.signal);
    return () => controller.abort();
  }, [loadRoles, cashier]);
  async function submit(data: CreateAdminUser) {
    if (active.current || uncertain || workspace.busy) return;
    if (
      !cashier &&
      [3, 5].includes(data.roleId) &&
      (!data.branchIds.length || (data.roleId === 5 && data.branchIds.length !== 1))
    ) {
      setError(
        "Asigna sucursales al administrador o selecciona una única sucursal para el cajero.",
      );
      return;
    }
    active.current = true;
    if (cashier) workspace.setBusy(true);
    setBusy(true);
    setError("");
    let ambiguous = true;
    try {
      const response = await fetch(cashier ? "/api/branch-admin/cashiers" : "/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          cashierBranch
            ? { person: data.person, email: data.email, branchId: cashierBranch.id }
            : data,
        ),
      });
      ambiguous = response.ok || response.status >= 500;
      const body: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          body && typeof body === "object" && "detail" in body
            ? String(body.detail)
            : "No se pudo crear la cuenta.",
        );
      const record =
        body && typeof body === "object" && "user" in body
          ? CreatedAdminUserSchema.safeParse(body.user)
          : null;
      if (
        !record?.success ||
        (cashier && (record.data.role.name !== "CAJERO" || record.data.role.id !== 5))
      )
        throw new Error(
          "No se pudo confirmar el alta. Verifica si la cuenta existe antes de repetirla.",
        );
      setCreated(record.data);
      reset();
    } catch (cause) {
      setUncertain(ambiguous);
      setError(
        (cause instanceof Error
          ? cause.message
          : "No se pudo confirmar el alta. Verifica la cuenta antes de reintentar.") +
          (cashier && ambiguous
            ? " Verifica si la cuenta fue creada antes de enviar otra solicitud."
            : ""),
      );
    } finally {
      active.current = false;
      if (cashier) workspace.setBusy(false);
      setBusy(false);
    }
  }
  if (created)
    return (
      <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7 md:p-10">
        <CircleCheck className="mb-5 text-[var(--tg-green)]" size={34} aria-hidden="true" />
        <h2 className="text-2xl font-semibold">{cashier ? "Cajero creado" : "Usuario creado"}</h2>
        <p role="status" className="mt-3">
          {created.name} {created.lastName} ya tiene una cuenta.
        </p>
        <dl className="my-6 grid gap-3 text-sm">
          <div>
            <dt className="text-[var(--tg-muted)]">Correo</dt>
            <dd>{created.email}</dd>
          </div>
          <div>
            <dt className="text-[var(--tg-muted)]">Rol</dt>
            <dd>{ADMIN_ROLE_LABELS[created.role.name] ?? created.role.name}</dd>
          </div>
        </dl>
        {cashierBranch && (
          <p className="mb-5 text-sm">
            Sucursal asignada: <strong>{cashierBranch.name}</strong>
          </p>
        )}
        <p className="mb-6 max-w-lg text-sm leading-6 text-[var(--tg-muted)]">
          La nueva cuenta recibirá un correo de bienvenida.
        </p>
        <Button onClick={() => setCreated(null)}>
          {cashier ? "Crear otro cajero" : "Crear otro usuario"}
        </Button>
        {!cashier && (
          <Link
            href="/system-admin/users"
            className="mt-4 block text-sm text-[var(--tg-green)] underline underline-offset-4"
          >
            Ver usuarios y asignar sucursales
          </Link>
        )}
      </section>
    );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8">
        <div className="mb-7 flex items-center gap-3">
          <UserRoundPlus size={24} className="text-[var(--tg-green)]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">{cashier ? "Crear cajero" : "Crear usuario"}</h2>
            <p className="mt-1 text-xs text-[var(--tg-muted)]">
              Todos los campos son obligatorios.
            </p>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            void handleSubmit(submit)(event);
          }}
          noValidate
        >
          <fieldset disabled={busy || uncertain} className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => {
              const issue = getFieldState(field.name, formState).error;
              const id = field.name.replace(".", "-");
              return (
                <div
                  key={field.name}
                  className={field.name === "email" ? "space-y-2 sm:col-span-2" : "space-y-2"}
                >
                  <Label htmlFor={id}>{field.label}</Label>
                  <Input
                    id={id}
                    type={field.type}
                    maxLength={field.maxLength}
                    autoComplete={field.autoComplete}
                    required
                    aria-invalid={!!issue}
                    aria-describedby={issue ? `${id}-error` : undefined}
                    {...register(field.name)}
                  />
                  {issue && (
                    <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
                      {issue.message}
                    </p>
                  )}
                </div>
              );
            })}
            {cashierBranch ? (
              <p className="text-sm sm:col-span-2">
                Rol: <strong>Cajero</strong> · Sucursal: <strong>{cashierBranch.name}</strong>
              </p>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="user-role">Rol del usuario</Label>
                <select
                  id="user-role"
                  required
                  disabled={busy || loadingRoles || !!rolesError}
                  aria-invalid={!!formState.errors.roleId}
                  aria-describedby="role-help"
                  className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-green)] disabled:opacity-60"
                  {...register("roleId", {
                    valueAsNumber: true,
                    onChange: () => setValue("branchIds", []),
                  })}
                >
                  <option value="">{loadingRoles ? "Cargando roles…" : "Selecciona un rol"}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {ADMIN_ROLE_LABELS[role.name] ?? role.name}
                    </option>
                  ))}
                </select>
                <p id="role-help" className="text-xs leading-5 text-[var(--tg-muted)]">
                  Los choferes se registran desde la flota de su sucursal para vincular su licencia.
                </p>
                {formState.errors.roleId && (
                  <p role="alert" className="text-xs text-red-600">
                    {formState.errors.roleId.message}
                  </p>
                )}
              </div>
            )}
          </fieldset>
          {!cashier && [3, 5].includes(roleId) && (
            <div className="mt-5 space-y-3">
              <Label htmlFor="user-branches">
                {roleId === 5 ? "Sucursal del cajero" : "Sucursales asignadas"}
              </Label>
              <select
                id="user-branches"
                multiple={roleId !== 5}
                value={roleId === 5 ? String(branchIds[0] ?? "") : branchIds.map(String)}
                disabled={busy || uncertain || branches.loading || !!branches.error}
                className="min-h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] p-3 text-sm"
                onChange={(event) =>
                  setValue(
                    "branchIds",
                    Array.from(event.target.selectedOptions)
                      .filter((option) => option.value)
                      .map((option) => Number(option.value)),
                    { shouldDirty: true },
                  )
                }
              >
                {roleId === 5 && <option value="">Selecciona una sucursal</option>}
                {branches.data?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {roleId !== 5 && (
                <p className="text-xs text-[var(--tg-muted)]">
                  Puedes seleccionar varias sucursales. Usa Ctrl o Cmd para añadir otras.
                </p>
              )}
              {branches.error && (
                <p role="alert">
                  {branches.error}{" "}
                  <button type="button" className="underline" onClick={branches.refresh}>
                    Consultar sucursales
                  </button>
                </p>
              )}
            </div>
          )}
          {rolesError && (
            <div
              role="alert"
              className="mt-5 space-y-3 rounded-lg border border-red-300 p-4 text-sm"
            >
              <p>{rolesError}</p>
              <Button
                type="button"
                variant="outline"
                disabled={loadingRoles}
                onClick={() => void loadRoles()}
              >
                <RotateCw size={14} aria-hidden="true" />
                Reintentar catálogo
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-lg border border-red-300 p-4 text-sm">
              {error}
            </p>
          )}
          {uncertain && (
            <p className="mt-4 text-sm">
              <Link href="/system-admin/users" className="underline">
                Consulta el listado antes de enviar otra solicitud.
              </Link>
            </p>
          )}
          <Button
            type="submit"
            disabled={
              busy || loadingRoles || !!rolesError || !roles.length || uncertain || workspace.busy
            }
            className="mt-7 w-full sm:w-auto"
          >
            {busy
              ? cashier
                ? "Creando cajero…"
                : "Creando usuario…"
              : cashier
                ? "Crear cajero"
                : "Crear usuario"}
          </Button>
        </form>
      </section>
      <aside className="rounded-2xl bg-[#16383e] p-6 text-[#eef6ed]">
        <Mail size={24} className="mb-5 text-[#b9d2bc]" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Acceso por correo</h2>
        <p className="mt-3 text-sm leading-7 text-[#b9d2bc]">
          La nueva cuenta recibirá un enlace de bienvenida por correo. No necesitas asignar una
          contraseña desde este formulario.
        </p>
        <p className="mt-5 border-t border-white/15 pt-5 text-xs leading-6 text-[#b9d2bc]">
          {cashierBranch
            ? "El cajero quedará vinculado únicamente a " +
              cashierBranch.name +
              ". Recibirá el enlace para establecer su contraseña por correo."
            : "Asigna las sucursales al registrar administradores y cajeros. Las cuentas de cliente se crean desde el registro público; los choferes se registran con su licencia desde flota."}
        </p>
      </aside>
    </div>
  );
}
