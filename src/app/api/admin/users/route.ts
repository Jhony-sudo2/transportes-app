import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminRequest, adminErrorResponse } from "@/lib/api/admin";
import {
  CreateStaffUserSchema,
  StaffCreatedSchema,
  StaffUserListSchema,
  AdminRoleListSchema,
  isCreatableRole,
  AdminUsersQuerySchema,
} from "@/lib/validators/admin-user";
import { ApplicationError } from "@/types/error";
import type { StaffCreateRequest } from "@/types/admin-user";
import { z } from "zod";
const DirectoryPageSchema = z.object({
  content: z.array(
    z.object({
      id: z.number().int().positive(),
      email: z.string().nullish(),
      name: z.string().nullish(),
      lastName: z.string().nullish(),
    }),
  ),
  totalPages: z.number().int().nonnegative(),
});
type DirectoryEntry = { email: string; name: string; lastName: string };
/** Directorio de usuarios por id. Si falla se devuelve null y el listado se muestra sin completar. */
async function userDirectory(token: string): Promise<Map<number, DirectoryEntry> | null> {
  const directory = new Map<number, DirectoryEntry>();
  try {
    for (let page = 0; page < 50; page++) {
      const result = DirectoryPageSchema.safeParse(
        await adminRequest(`users?page=${page}&size=200&sortBy=id&ascending=true`, token),
      );
      if (!result.success) return null;
      for (const user of result.data.content)
        directory.set(user.id, {
          email: user.email ?? "",
          name: user.name ?? "",
          lastName: user.lastName ?? "",
        });
      if (page + 1 >= result.data.totalPages) break;
    }
  } catch {
    return null;
  }
  return directory;
}
export async function GET(request: NextRequest) {
  try {
    const { token } = await requireAdminAccess();
    const params = request.nextUrl.searchParams;
    const parsed = AdminUsersQuerySchema.safeParse({
      page: params.get("page") ?? undefined,
      email: params.get("email") ?? undefined,
      role: params.get("role") ?? undefined,
      active: params.get("active") ?? undefined,
      branchId: params.get("branchId") ?? undefined,
    });
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Revisa el correo y la página solicitada.",
      );
    const query = new URLSearchParams();
    if (parsed.data.role) query.set("role", parsed.data.role);
    if (parsed.data.active) query.set("active", parsed.data.active);
    if (parsed.data.branchId) query.set("branchId", String(parsed.data.branchId));
    const result = StaffUserListSchema.safeParse(await adminRequest(`users/staff?${query}`, token));
    if (!result.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "El listado de usuarios no tiene el formato esperado.",
      );
    // /users/staff no trae correo ni nombre: se completan con el directorio /users (ADMIN).
    let staff = result.data;
    if (staff.some((user) => !user.email || !user.name)) {
      const directory = await userDirectory(token);
      if (directory)
        staff = staff.map((user) => {
          const found = directory.get(user.id);
          return found
            ? {
                ...user,
                email: user.email || found.email,
                name: user.name || found.name,
                lastName: user.lastName || found.lastName,
              }
            : user;
        });
    }
    if (parsed.data.email && staff.some((user) => !user.email))
      throw new ApplicationError(
        "validation.failed",
        422,
        "La búsqueda por correo no está disponible por ahora. Consulta por rol, sucursal o estado.",
      );
    const email = parsed.data.email.toLowerCase();
    const users = staff.filter((user) => !email || user.email.toLowerCase().includes(email));
    const size = 10;
    return NextResponse.json({
      content: users.slice(parsed.data.page * size, (parsed.data.page + 1) * size),
      page: parsed.data.page,
      size,
      totalElements: users.length,
      totalPages: Math.ceil(users.length / size),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const input = CreateStaffUserSchema.safeParse(raw);
    if (!input.success)
      return NextResponse.json(
        { detail: input.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    const roles = AdminRoleListSchema.safeParse(await adminRequest("roles", token));
    if (!roles.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo validar el catálogo de roles.",
      );
    if (!roles.data.some((role) => role.id === input.data.roleId && isCreatableRole(role)))
      return NextResponse.json(
        { detail: "El rol seleccionado ya no está disponible. Actualiza el catálogo." },
        { status: 400 },
      );
    const selectedRole = roles.data.find(
      (role) => role.id === input.data.roleId && isCreatableRole(role),
    );
    if (!selectedRole) throw new ApplicationError("validation.failed", 400, "Rol inválido.");
    const roleName = selectedRole.name === "CAJERO" ? "CASHIER" : selectedRole.name;
    const { adress, ...person } = input.data.person;
    const upstream: StaffCreateRequest = {
      person: { ...person, address: adress, email: input.data.email },
      role: roleName,
      branchIds: input.data.branchIds,
    };
    const result = StaffCreatedSchema.safeParse(await adminRequest("users/staff", token, upstream));
    if (!result.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el alta. Antes de repetirla, verifica si la cuenta ya fue creada.",
      );
    if (
      result.data.role !== roleName ||
      result.data.branchIds.length !== input.data.branchIds.length ||
      !result.data.branchIds.every((id) => input.data.branchIds.includes(id))
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma el rol y las sucursales del usuario creado. Consulta el listado antes de repetir.",
      );
    const { name, lastName } = input.data.person;
    const id = result.data.userId,
      email = input.data.email,
      role = {
        id: selectedRole.id,
        name: selectedRole.name === "CASHIER" ? "CAJERO" : selectedRole.name,
      };
    return NextResponse.json(
      { status: "created", user: { id, name, lastName, email, role } },
      { status: 201 },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
