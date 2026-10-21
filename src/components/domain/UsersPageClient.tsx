"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CreateSystemAdminSchema,
  CreateCongressAdminSchema,
  type UserData,
  type CreateSystemAdminData,
  type CreateCongressAdminData,
} from "@/lib/validators/user";
import { ProblemDetailSchema } from "@/lib/validators/error";
import type { InstitutionData } from "@/lib/validators/institution";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UsersPageClientProps {
  users: UserData[];
  institutions: InstitutionData[];
}

type DialogMode = "none" | "system-admin" | "congress-admin";

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "Admin. Sistema",
  CONGRESS_ADMIN: "Admin. Congreso",
  PARTICIPANT: "Participante",
  GUEST_SPEAKER: "Ponente Invitado",
};

function RoleBadge({ role }: { role: string }): React.ReactElement {
  if (role === "SYSTEM_ADMIN") {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-white">
        {ROLE_LABELS[role] ?? role}
      </span>
    );
  }
  if (role === "CONGRESS_ADMIN") {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-warning-bg)] border border-[var(--color-warning)] px-2 py-0.5 text-xs font-medium text-[var(--color-warning-text)]">
        {ROLE_LABELS[role] ?? role}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-primary)]">
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }): React.ReactElement {
  if (active) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-success)] px-2 py-0.5 text-xs font-medium text-white">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-text-secondary)] px-2 py-0.5 text-xs font-medium text-white">
      Inactivo
    </span>
  );
}

function FieldError({ message }: { message: string | undefined }): React.ReactElement | null {
  if (message === undefined) return null;
  return (
    <p className="mt-1 font-secondary text-xs text-[var(--color-error)]">{message}</p>
  );
}

interface SystemAdminFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function SystemAdminForm({ onSuccess, onCancel }: SystemAdminFormProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSystemAdminData>({
    resolver: zodResolver(CreateSystemAdminSchema),
  });

  const onSubmit = async (data: CreateSystemAdminData): Promise<void> => {
    setServerError(null);
    const res = await fetch("/api/users/system-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      onSuccess();
    } else {
      const body: unknown = await res.json();
      const parsed = ProblemDetailSchema.safeParse(body);
      setServerError(parsed.success ? parsed.data.detail : "Error al crear el administrador del sistema.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="sa-fullName">Nombre completo</Label>
        <Input
          id="sa-fullName"
          placeholder="Nombre completo"
          {...register("fullName")}
        />
        <FieldError message={errors.fullName?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sa-email">Correo electronico</Label>
        <Input
          id="sa-email"
          type="email"
          placeholder="correo@ejemplo.com"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sa-password">Contrasena</Label>
        <Input
          id="sa-password"
          type="password"
          placeholder="Minimo 8 caracteres"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sa-organization">Organizacion</Label>
        <Input
          id="sa-organization"
          placeholder="Nombre de la organizacion"
          {...register("organization")}
        />
        <FieldError message={errors.organization?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sa-phone">Telefono</Label>
        <Input
          id="sa-phone"
          placeholder="+502 0000-0000"
          {...register("phone")}
        />
        <FieldError message={errors.phone?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sa-personalId">Identificacion</Label>
        <Input
          id="sa-personalId"
          placeholder="DPI o pasaporte (solo letras y numeros)"
          {...register("personalId")}
        />
        <FieldError message={errors.personalId?.message} />
      </div>
      {serverError !== null && (
        <p className="font-secondary text-xs text-[var(--color-error)]">{serverError}</p>
      )}
      <DialogFooter className="mt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 min-h-[44px]"
        >
          {isSubmitting ? "Creando..." : "Crear administrador"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface CongressAdminFormProps {
  institutions: InstitutionData[];
  onSuccess: () => void;
  onCancel: () => void;
}

function CongressAdminForm({
  institutions,
  onSuccess,
  onCancel,
}: CongressAdminFormProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCongressAdminData>({
    resolver: zodResolver(CreateCongressAdminSchema),
    defaultValues: { linkedInstitutions: [] },
  });

  const toggleInstitution = (id: string): void => {
    const next = selectedInstitutions.includes(id)
      ? selectedInstitutions.filter((i) => i !== id)
      : [...selectedInstitutions, id];
    setSelectedInstitutions(next);
    setValue("linkedInstitutions", next, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateCongressAdminData): Promise<void> => {
    setServerError(null);
    const res = await fetch("/api/users/congress-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      onSuccess();
    } else {
      const body: unknown = await res.json();
      const parsed = ProblemDetailSchema.safeParse(body);
      setServerError(parsed.success ? parsed.data.detail : "Error al crear el administrador de congreso.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="ca-fullName">Nombre completo</Label>
        <Input
          id="ca-fullName"
          placeholder="Nombre completo"
          {...register("fullName")}
        />
        <FieldError message={errors.fullName?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ca-email">Correo electronico</Label>
        <Input
          id="ca-email"
          type="email"
          placeholder="correo@ejemplo.com"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ca-password">Contrasena</Label>
        <Input
          id="ca-password"
          type="password"
          placeholder="Minimo 8 caracteres"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ca-organization">Organizacion</Label>
        <Input
          id="ca-organization"
          placeholder="Nombre de la organizacion"
          {...register("organization")}
        />
        <FieldError message={errors.organization?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ca-phone">Telefono</Label>
        <Input
          id="ca-phone"
          placeholder="+502 0000-0000"
          {...register("phone")}
        />
        <FieldError message={errors.phone?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ca-personalId">Identificacion</Label>
        <Input
          id="ca-personalId"
          placeholder="DPI o pasaporte (solo letras y numeros)"
          {...register("personalId")}
        />
        <FieldError message={errors.personalId?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Instituciones vinculadas</Label>
        <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--color-border)] p-2 flex flex-col gap-1">
          {institutions.length === 0 && (
            <p className="font-secondary text-xs text-[var(--color-text-secondary)] py-2 text-center">
              No hay instituciones disponibles
            </p>
          )}
          {institutions.map((inst) => (
            <label
              key={inst.id}
              className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-[var(--color-surface)] transition-colors duration-150"
            >
              <input
                type="checkbox"
                checked={selectedInstitutions.includes(inst.id)}
                onChange={() => { toggleInstitution(inst.id); }}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              />
              <span className="font-secondary text-sm text-[var(--color-text-primary)]">
                {inst.name}
              </span>
            </label>
          ))}
        </div>
        <FieldError message={errors.linkedInstitutions?.message} />
      </div>
      {serverError !== null && (
        <p className="font-secondary text-xs text-[var(--color-error)]">{serverError}</p>
      )}
      <DialogFooter className="mt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 min-h-[44px]"
        >
          {isSubmitting ? "Creando..." : "Crear administrador"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type RoleFilter = "ALL" | "SYSTEM_ADMIN" | "CONGRESS_ADMIN" | "PARTICIPANT" | "GUEST_SPEAKER";
type StatusFilter = "ALL" | "active" | "inactive";

export function UsersPageClient({
  users,
  institutions,
}: UsersPageClientProps): React.ReactElement {
  const router = useRouter();
  const [dialogMode, setDialogMode] = useState<DialogMode>("none");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q !== "" && !u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
        return false;
      }
      if (roleFilter !== "ALL" && !u.roles.includes(roleFilter)) return false;
      if (statusFilter === "active" && !u.active) return false;
      if (statusFilter === "inactive" && u.active) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const clearFilters = (): void => {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  };

  const hasActiveFilters = search !== "" || roleFilter !== "ALL" || statusFilter !== "ALL";

  const closeDialog = (): void => {
    setDialogMode("none");
  };

  const handleSuccess = (): void => {
    closeDialog();
    router.refresh();
  };

  const toggleUserStatus = async (user: UserData): Promise<void> => {
    setActionLoading(user.id);
    setActionError(null);
    const endpoint = user.active
      ? `/api/users/${user.id}/deactivate`
      : `/api/users/${user.id}/activate`;
    const res = await fetch(endpoint, { method: "PATCH" });
    setActionLoading(null);
    if (res.ok) {
      router.refresh();
    } else {
      const body: unknown = await res.json();
      const parsed = ProblemDetailSchema.safeParse(body);
      setActionError(parsed.success ? parsed.data.detail : "Error al cambiar el estado del usuario.");
    }
  };

  return (
    <div data-testid="system-admin-users-page" className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Administra los usuarios del sistema y sus roles."
        action={
          <div className="flex items-center gap-2">
            <Button
              data-testid="new-system-admin-button"
              onClick={() => { setDialogMode("system-admin"); }}
              className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 min-h-[44px] gap-1.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo Admin. Sistema
            </Button>
            <Button
              data-testid="new-congress-admin-button"
              onClick={() => { setDialogMode("congress-admin"); }}
              variant="outline"
              className="min-h-[44px] gap-1.5 border-[var(--color-border)]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo Admin. Congreso
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]"
            strokeWidth={1.5}
          />
          <Input
            data-testid="users-search"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 h-10"
          />
        </div>
        <select
          data-testid="users-role-filter"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as RoleFilter); }}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-white)] px-3 font-secondary text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] cursor-pointer"
        >
          <option value="ALL">Todos los roles</option>
          <option value="SYSTEM_ADMIN">Admin. Sistema</option>
          <option value="CONGRESS_ADMIN">Admin. Congreso</option>
          <option value="PARTICIPANT">Participante</option>
          <option value="GUEST_SPEAKER">Ponente Invitado</option>
        </select>
        <select
          data-testid="users-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); }}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-white)] px-3 font-secondary text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] cursor-pointer"
        >
          <option value="ALL">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        {hasActiveFilters && (
          <button
            data-testid="users-clear-filters"
            onClick={clearFilters}
            className="flex cursor-pointer items-center gap-1 rounded-md px-3 h-10 font-secondary text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors duration-200"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Limpiar
          </button>
        )}
      </div>

      {actionError !== null && (
        <p className="font-secondary text-sm text-[var(--color-error)]">{actionError}</p>
      )}

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" strokeWidth={1.5} />}
          title={hasActiveFilters ? "Sin resultados" : "Sin usuarios registrados"}
          description={hasActiveFilters ? "Intenta con otros filtros de busqueda." : "Crea un nuevo administrador para comenzar."}
        />
      ) : (
        <div
          data-testid="users-table"
          className="animate-fade-in-up overflow-x-auto rounded-lg border border-[var(--color-border)]"
        >
          <table className="w-full border-collapse font-secondary text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                  Correo electronico
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                  Roles
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  data-testid="user-row"
                  className={
                    idx % 2 === 0
                      ? "border-b border-[var(--color-border)] bg-[var(--color-white)] transition-colors duration-150"
                      : "border-b border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-150"
                  }
                >
                  <td className="px-4 py-3 text-[var(--color-text-primary-black)]">
                    {user.fullName}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={user.active} />
                  </td>
                  <td className="px-4 py-3">
                    {user.active ? (
                      <Button
                        data-testid="user-deactivate-button"
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === user.id}
                        onClick={() => { void toggleUserStatus(user); }}
                        className="min-h-[44px] border-[var(--color-border)] text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                      >
                        {actionLoading === user.id ? "..." : "Desactivar"}
                      </Button>
                    ) : (
                      <Button
                        data-testid="user-activate-button"
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === user.id}
                        onClick={() => { void toggleUserStatus(user); }}
                        className="min-h-[44px] border-[var(--color-border)] text-[var(--color-success-text)] hover:bg-[var(--color-success)]/10"
                      >
                        {actionLoading === user.id ? "..." : "Activar"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialogMode === "system-admin"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="bg-[var(--color-white)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Nuevo administrador del sistema
            </DialogTitle>
          </DialogHeader>
          <SystemAdminForm onSuccess={handleSuccess} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "congress-admin"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="bg-[var(--color-white)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Nuevo administrador de congreso
            </DialogTitle>
          </DialogHeader>
          <CongressAdminForm
            institutions={institutions}
            onSuccess={handleSuccess}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
