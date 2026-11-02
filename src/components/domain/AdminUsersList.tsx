"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerData } from "@/hooks/useCustomerData";
import { AdminUsersPageSchema, ADMIN_ROLE_LABELS } from "@/lib/validators/admin-user";
import type { AdminUser } from "@/types/admin-user";
import { CustomerDataState } from "./CustomerDataState";
import { ReportTable, type Column } from "./ReportTable";
import { AdminUserBranches } from "./AdminUserBranches";
import { AdminUserAvailabilityDialog } from "./AdminUserAvailabilityDialog";
import { BranchListSchema } from "@/lib/validators/branch";

export function AdminUsersList({ currentUserId }: { currentUserId: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState("");
  const [draftFilters, setDraftFilters] = useState({ role: "", active: "", branchId: "" });
  const [filters, setFilters] = useState({ role: "", active: "", branchId: "" });
  const branches = useCustomerData("/api/admin/branches", BranchListSchema);
  const query = new URLSearchParams({ page: String(page), email });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  const resource = useCustomerData(`/api/admin/users?${query}`, AdminUsersPageSchema);
  const data = resource.data;
  const columns: Column<AdminUser>[] = [
    { key: "id", header: "ID" },
    {
      key: "name",
      header: "Nombre",
      render: (_value, user) => (
        <span className="block min-w-36 font-medium">
          {[user.name, user.lastName].filter(Boolean).join(" ") || `Usuario #${user.id}`}
        </span>
      ),
    },
    {
      key: "email",
      header: "Correo",
      render: (_value, user) => (
        <span className="whitespace-nowrap">{user.email || "No informado por el servicio"}</span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (_value, user) => ADMIN_ROLE_LABELS[user.role.name] ?? user.role.name,
    },
    {
      key: "isActive",
      header: "Estado",
      render: (_value, user) => (
        <div className="flex flex-col items-start gap-3">
          <span className="whitespace-nowrap rounded-full border border-[var(--tg-line)] px-3 py-1 text-xs">
            {user.isActive ? "Activo" : "Inactivo"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNotice("");
              setStatusTarget(user);
            }}
            aria-label={`${user.isActive ? "Desactivar" : "Activar"} usuario ${user.email || `#${user.id}`}`}
          >
            {user.isActive ? "Desactivar" : "Activar"}
          </Button>
        </div>
      ),
    },
    {
      key: "branchIds",
      header: "Sucursales",
      render: (_value, user) =>
        user.role.name === "SUCURSAL_ADMIN" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(user)}
            aria-label={`Gestionar sucursales de ${user.email || `usuario #${user.id}`}`}
          >
            Sucursales ({user.branchIds?.length ?? 0})
          </Button>
        ) : user.role.name === "CAJERO" ? (
          `${user.branchIds?.length ?? 0} asignada(s)`
        ) : (
          "—"
        ),
    },
  ];
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm leading-6 text-[var(--tg-muted)]">
          Consulta las cuentas creadas. Como administrador del sistema, puedes asignar sucursales a
          los administradores de sucursal.
        </p>
        <Button asChild>
          <Link href="/system-admin/users/new">
            <Plus size={18} aria-hidden="true" />
            Crear usuario
          </Link>
        </Button>
      </div>
      {data?.content.some((user) => !user.email || !user.name) && (
        <p role="status" className="tg-notice">
          El servicio de personal aún no informa nombre o correo para algunas cuentas. Puedes
          identificarlas por su ID, rol y sucursales.
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setEmail(search.trim());
          setFilters(draftFilters);
          if (page === 0 && email === search.trim()) resource.refresh();
        }}
      >
        <div className="w-full min-w-0 space-y-2 sm:w-auto sm:flex-1">
          <Label htmlFor="users-search">Buscar por correo</Label>
          <Input
            id="users-search"
            type="search"
            maxLength={255}
            placeholder="Correo completo o parte del correo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="users-role">Filtrar por rol</Label>
          <select
            id="users-role"
            value={draftFilters.role}
            onChange={(event) => setDraftFilters({ ...draftFilters, role: event.target.value })}
            className="h-12 rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm"
          >
            <option value="">Todos los roles</option>
            {["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "DRIVER", "CASHIER"].map((role) => (
              <option key={role} value={role}>
                {ADMIN_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="users-active">Filtrar por estado</Label>
          <select
            id="users-active"
            value={draftFilters.active}
            onChange={(event) => setDraftFilters({ ...draftFilters, active: event.target.value })}
            className="h-12 rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="users-branch">Filtrar por sucursal</Label>
          <select
            id="users-branch"
            value={draftFilters.branchId}
            disabled={branches.loading || !!branches.error}
            onChange={(event) => setDraftFilters({ ...draftFilters, branchId: event.target.value })}
            className="h-12 max-w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm"
          >
            <option value="">Todas las sucursales</option>
            {branches.data?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={resource.loading}>
          <Search size={16} aria-hidden="true" />
          Buscar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={resource.loading}
          onClick={() => {
            setSearch("");
            setEmail("");
            setPage(0);
            setFilters({ role: "", active: "", branchId: "" });
            setDraftFilters({ role: "", active: "", branchId: "" });
            resource.refresh();
          }}
        >
          Limpiar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={resource.loading}
          onClick={resource.refresh}
        >
          Actualizar listado
        </Button>
      </form>
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {data && (
        <>
          {data.content.length ? (
            <ReportTable
              columns={columns}
              data={data.content}
              caption="Usuarios registrados"
              getRowKey={(user) => user.id}
            />
          ) : (
            <p className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 text-sm text-[var(--tg-muted)]">
              {email
                ? "No hay usuarios que coincidan con ese correo."
                : "Todavía no hay usuarios para mostrar."}
            </p>
          )}
          <nav
            aria-label="Paginación de usuarios"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p>
              {data.totalElements
                ? `Página ${data.page + 1} de ${data.totalPages} · ${data.totalElements} usuarios`
                : "0 usuarios"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={resource.loading || page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={resource.loading || page + 1 >= data.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Siguiente
              </Button>
            </div>
          </nav>
        </>
      )}
      {selected && (
        <AdminUserBranches
          key={selected.id}
          user={selected}
          onClose={() => setSelected(null)}
          onAssigned={resource.refresh}
        />
      )}
      {statusTarget && (
        <AdminUserAvailabilityDialog
          user={statusTarget}
          currentUserId={currentUserId}
          onClose={() => setStatusTarget(null)}
          refresh={resource.refresh}
          onUpdated={(user, signedOut) => {
            setStatusTarget(null);
            if (signedOut) {
              router.replace("/login");
              router.refresh();
              return;
            }
            setNotice(`Cuenta ${user.email} ${user.isActive ? "activada" : "desactivada"}.`);
            resource.refresh();
          }}
        />
      )}
    </div>
  );
}
