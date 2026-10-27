import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminRequest, adminErrorResponse } from "@/lib/api/admin";
import {
  CreateAdminUserSchema,
  AdminRoleListSchema,
  isCreatableRole,
  AdminUsersPageSchema,
  AdminUsersQuerySchema,
} from "@/lib/validators/admin-user";
import { TransportUserSchema } from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";
export async function GET(request: NextRequest) {
  try {
    const { token } = await requireAdminAccess();
    const params = request.nextUrl.searchParams;
    const parsed = AdminUsersQuerySchema.safeParse({
      page: params.get("page") ?? undefined,
      email: params.get("email") ?? undefined,
    });
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Revisa el correo y la página solicitada.",
      );
    const query = new URLSearchParams({
      page: String(parsed.data.page),
      size: "10",
      sortBy: "id",
      ascending: "false",
      email: parsed.data.email,
    });
    const result = AdminUsersPageSchema.safeParse(await adminRequest(`users?${query}`, token));
    if (!result.success || result.data.page !== parsed.data.page || result.data.size !== 10)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "El listado de usuarios no tiene el formato esperado.",
      );
    return NextResponse.json(result.data);
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
    const input = CreateAdminUserSchema.safeParse(raw);
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
    const result = TransportUserSchema.safeParse(await adminRequest("users", token, input.data));
    if (!result.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el alta. Antes de repetirla, verifica si la cuenta ya fue creada.",
      );
    const { id, name, lastName, email, role } = result.data;
    return NextResponse.json(
      { status: "created", user: { id, name, lastName, email, role } },
      { status: 201 },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
