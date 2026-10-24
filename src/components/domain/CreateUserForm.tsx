"use client";
import { useCallback, useEffect, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoundPlus, Mail, CircleCheck, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreateAdminUserSchema,
  AdminRoleListSchema,
  CreatedAdminUserSchema,
  ADMIN_ROLE_LABELS,
  type CreateAdminUser,
  type AdminRole,
  type CreatedAdminUser,
} from "@/lib/validators/admin-user";
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
    maxLength: 255,
    autoComplete: "email",
  },
];
export function CreateUserForm() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAdminUser | null>(null);
  const { register, handleSubmit, getFieldState, formState, reset } = useForm<CreateAdminUser>({
    resolver: zodResolver(CreateAdminUserSchema),
    defaultValues: {
      person: { name: "", lastName: "", dpi: "", nit: "", phone: "", adress: "" },
      email: "",
    },
  });
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
    const controller = new AbortController();
    void loadRoles(controller.signal);
    return () => controller.abort();
  }, [loadRoles]);
  async function submit(data: CreateAdminUser) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
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
      if (!record?.success)
        throw new Error(
          "No se pudo confirmar el alta. Verifica si la cuenta existe antes de repetirla.",
        );
      setCreated(record.data);
      reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo confirmar el alta. Verifica la cuenta antes de reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7 md:p-10">
        <CircleCheck className="mb-5 text-[var(--tg-green)]" size={34} aria-hidden="true" />
        <h2 className="text-2xl font-semibold">Usuario creado</h2>
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
        <p className="mb-6 max-w-lg text-sm leading-6 text-[var(--tg-muted)]">
          Se solicitó al servicio el envío del correo de bienvenida. La recepción depende del
          servicio de notificaciones.
        </p>
        <Button onClick={() => setCreated(null)}>Crear otro usuario</Button>
      </section>
    );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8">
        <div className="mb-7 flex items-center gap-3">
          <UserRoundPlus size={24} className="text-[var(--tg-green)]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">Crear usuario</h2>
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
          <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-role">Rol del usuario</Label>
              <select
                id="user-role"
                required
                disabled={busy || loadingRoles || !!rolesError}
                aria-invalid={!!formState.errors.roleId}
                aria-describedby="role-help"
                className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-green)] disabled:opacity-60"
                {...register("roleId", { valueAsNumber: true })}
              >
                <option value="">{loadingRoles ? "Cargando roles…" : "Selecciona un rol"}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {ADMIN_ROLE_LABELS[role.name] ?? role.name}
                  </option>
                ))}
              </select>
              <p id="role-help" className="text-xs leading-5 text-[var(--tg-muted)]">
                Los choferes se registran desde Fleet para vincular su licencia e identidad.
              </p>
              {formState.errors.roleId && (
                <p role="alert" className="text-xs text-red-600">
                  {formState.errors.roleId.message}
                </p>
              )}
            </div>
          </fieldset>
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
          <Button
            type="submit"
            disabled={busy || loadingRoles || !!rolesError || !roles.length}
            className="mt-7 w-full sm:w-auto"
          >
            {busy ? "Creando usuario…" : "Crear usuario"}
          </Button>
        </form>
      </section>
      <aside className="rounded-2xl bg-[#16383e] p-6 text-[#eef6ed]">
        <Mail size={24} className="mb-5 text-[#b9d2bc]" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Acceso por correo</h2>
        <p className="mt-3 text-sm leading-7 text-[#b9d2bc]">
          El servicio genera el enlace de bienvenida para la nueva cuenta. No necesitas asignar una
          contraseña desde este formulario.
        </p>
        <p className="mt-5 border-t border-white/15 pt-5 text-xs leading-6 text-[#b9d2bc]">
          La asignación de sucursales se realizará desde el módulo correspondiente.
        </p>
      </aside>
    </div>
  );
}
