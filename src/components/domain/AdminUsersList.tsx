"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerData } from "@/hooks/useCustomerData";
import {
  AdminUsersPageSchema,
  ADMIN_ROLE_LABELS,
  type AdminUser,
} from "@/lib/validators/admin-user";
import { CustomerDataState } from "./CustomerDataState";
import { ReportTable, type Column } from "./ReportTable";
import { AdminUserBranches } from "./AdminUserBranches";

export function AdminUsersList() {
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const query = new URLSearchParams({ page: String(page), email });
  const resource = useCustomerData(`/api/admin/users?${query}`, AdminUsersPageSchema);
  const data = resource.data;
  const columns: Column<AdminUser>[] = [
    { key: "id", header: "ID" },
    {
      key: "name",
      header: "Nombre",
      render: (_value, user) => (
        <span className="block min-w-36 font-medium">
          {user.name} {user.lastName}
        </span>
      ),
    },
    {
      key: "email",
      header: "Correo",
      render: (_value, user) => <span className="whitespace-nowrap">{user.email}</span>,
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
        <span className="whitespace-nowrap rounded-full border border-[var(--tg-line)] px-3 py-1 text-xs">
          {user.isActive ? "Activo" : "Inactivo"}
        </span>
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
            aria-label={`Gestionar sucursales de ${user.email}`}
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
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setEmail(search.trim());
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
    </div>
  );
}
