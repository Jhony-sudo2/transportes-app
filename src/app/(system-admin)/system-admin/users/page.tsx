import { redirect, notFound } from "next/navigation";
import { requireAdminAccess } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
import { AdminUsersList } from "@/components/domain/AdminUsersList";
export default async function AdminUsersPage() {
  let currentUserId: number;
  try {
    currentUserId = (await requireAdminAccess()).user.id;
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    if (error instanceof ApplicationError && error.status === 403) notFound();
    throw error;
  }
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8 md:py-12">
      <p className="tg-eyebrow">ADMINISTRACIÓN / USUARIOS</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Usuarios del sistema</h1>
      <AdminUsersList currentUserId={currentUserId} />
    </section>
  );
}
