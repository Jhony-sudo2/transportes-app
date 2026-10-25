import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  requireAccountAccess,
  getAccountProfile,
  getOwnDriver,
  accountIamRequest,
} from "@/lib/api/account";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
import {
  AccountProfileRequestSchema,
  DriverProfileRequestSchema,
  AccountDriverSchema,
  AccountProfileSchema,
} from "@/lib/validators/account";
import { TransportUserSchema } from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";

export async function GET() {
  try {
    return NextResponse.json(await getAccountProfile());
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function PUT(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const access = await requireAccountAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const driverRole = access.user.role.name === "DRIVER";
    const parsed = (
      driverRole ? DriverProfileRequestSchema : AccountProfileRequestSchema
    ).safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const data = parsed.data;
    if (driverRole) {
      const driver = await getOwnDriver(access);
      if (driver.pendingOperationId || !["ACTIVE", "INACTIVE"].includes(driver.status ?? ""))
        throw new ApplicationError(
          "resource.conflict",
          409,
          "Espera a que termine la operación pendiente de tu perfil antes de guardar otro cambio.",
        );
      const updated = validatedFleetResult(
        AccountDriverSchema,
        await fleetRequest(
          `drivers/${driver.id}`,
          access.token,
          { ...data, photo: driver.photo },
          "PUT",
        ),
        "No se pudo confirmar la solicitud. Consulta tu perfil antes de volver a guardarlo.",
      );
      if (
        updated.id !== driver.id ||
        updated.userId !== access.user.id ||
        !updated.pendingOperationId
      )
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se recibió una referencia válida para consultar el cambio de tu perfil.",
        );
      return NextResponse.json(
        { status: "pending", operationId: updated.pendingOperationId },
        { status: 202 },
      );
    }
    if (data.dpi !== (access.user.dpi ?? ""))
      throw new ApplicationError(
        "validation.failed",
        400,
        "El DPI de esta cuenta se conserva al actualizar el perfil.",
      );
    const fields = {
      name: data.name,
      lastName: data.lastName,
      email: data.email,
      nit: data.nit,
      phone: data.phone,
      adress: data.adress,
    };
    const updated = validatedFleetResult(
      TransportUserSchema,
      await accountIamRequest(
        `users/${access.user.id}`,
        access.token,
        { ...fields, twoFactorEnabled: access.user.twoFactorEnabled },
        "PUT",
      ),
      "No se pudo confirmar el perfil actualizado.",
    );
    if (
      updated.id !== access.user.id ||
      updated.role.name !== access.user.role.name ||
      updated.name !== data.name ||
      updated.lastName !== data.lastName ||
      updated.email !== data.email ||
      updated.nit !== data.nit ||
      updated.phone !== data.phone ||
      updated.adress !== data.adress
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma los datos solicitados. Actualiza tu perfil para verificar el resultado.",
      );
    return NextResponse.json({
      status: "updated",
      profile: AccountProfileSchema.parse({ user: updated, driver: null }),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
