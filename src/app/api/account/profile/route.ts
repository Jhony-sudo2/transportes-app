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
import { driverPhotoError } from "@/lib/validators/fleet-resources";

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
    const driverRole = access.user.role.name === "DRIVER";
    const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data");
    let raw: unknown;
    let photo: File | null = null;
    if (multipart) {
      if (!driverRole)
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "Solo el perfil del chofer admite fotografías.",
        );
      const length = Number(request.headers.get("content-length"));
      if (Number.isFinite(length) && length > 2 * 1024 * 1024)
        throw new ApplicationError(
          "validation.failed",
          413,
          "La fotografía debe pesar como máximo 1 MB.",
        );
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new ApplicationError(
          "validation.failed",
          400,
          "Envía los datos de tu perfil en un formulario válido.",
        );
      }
      if (
        Array.from(form.keys()).some((key) => !["request", "photo"].includes(key)) ||
        form.getAll("request").length !== 1 ||
        form.getAll("photo").length > 1
      )
        throw new ApplicationError(
          "validation.failed",
          400,
          "El formulario del perfil contiene campos inválidos.",
        );
      const part = form.get("request");
      try {
        if (part === null || (typeof part === "string" ? part.length : part.size) > 16384)
          throw new Error();
        raw = JSON.parse(typeof part === "string" ? part : await part.text());
      } catch {
        throw new ApplicationError(
          "validation.failed",
          400,
          "Los datos del perfil no son válidos.",
        );
      }
      const file = form.get("photo");
      if (file !== null) {
        if (typeof file === "string")
          throw new ApplicationError(
            "validation.failed",
            400,
            "Selecciona un archivo para actualizar tu fotografía.",
          );
        const issue = driverPhotoError(file);
        if (issue)
          throw new ApplicationError(
            "validation.failed",
            file.size > 1024 * 1024 ? 413 : 400,
            issue,
          );
        const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        const png =
          bytes.length >= 8 &&
          [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
        const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        if (!(file.type === "image/png" && png) && !(file.type === "image/jpeg" && jpeg))
          throw new ApplicationError(
            "validation.failed",
            400,
            "El archivo no es una fotografía JPG o PNG válida.",
          );
        photo = file;
      }
    } else {
      try {
        raw = await request.json();
      } catch {
        return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
      }
    }
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
      const upstream = new FormData();
      upstream.append(
        "request",
        new Blob([JSON.stringify({ ...data, photo: driver.photo })], { type: "application/json" }),
        "request.json",
      );
      if (photo)
        upstream.append("photo", photo, photo.type === "image/png" ? "photo.png" : "photo.jpg");
      const updated = validatedFleetResult(
        AccountDriverSchema,
        await fleetRequest(`drivers/${driver.id}`, access.token, upstream, "PUT"),
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
        { ...fields, twoFactorEnabled: data.twoFactorEnabled ?? access.user.twoFactorEnabled },
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
      updated.adress !== data.adress ||
      updated.twoFactorEnabled !== (data.twoFactorEnabled ?? access.user.twoFactorEnabled)
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
