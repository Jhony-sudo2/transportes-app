import { DriverListSchema } from "@/lib/validators/fleet-resources";
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  getBranchWorkspace,
  requireSelectedBranch,
  validatedFleetResult,
} from "@/lib/api/branch-workspace";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import {
  CreateDriverSchema,
  CreatedDriverSchema,
  driverPhotoError,
} from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 2 * 1024 * 1024)
      return NextResponse.json(
        { detail: "La fotografía debe pesar como máximo 1 MB." },
        { status: 413 },
      );
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { detail: "Envía los datos y la fotografía del chofer." },
        { status: 400 },
      );
    }
    const photo = form.get("photo");
    if (photo === null || typeof photo === "string")
      return NextResponse.json({ detail: "Selecciona una fotografía." }, { status: 400 });
    const photoError = driverPhotoError(photo);
    if (photoError) return NextResponse.json({ detail: photoError }, { status: 400 });
    const bytes = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
    const png =
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!(photo.type === "image/png" && png) && !(photo.type === "image/jpeg" && jpeg))
      return NextResponse.json(
        { detail: "El archivo no es una fotografía JPG o PNG válida." },
        { status: 400 },
      );
    const part = form.get("request");
    let raw: unknown;
    try {
      if (!part || (typeof part !== "string" && part.size > 16384)) throw new Error();
      raw = JSON.parse(typeof part === "string" ? part : await part.text());
    } catch {
      return NextResponse.json({ detail: "Los datos del chofer no son válidos." }, { status: 400 });
    }
    const parsed = CreateDriverSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const { token, branchId } = await requireSelectedBranch(parsed.data.branchId, workspace);
    const upstream = new FormData();
    upstream.append(
      "request",
      new Blob([JSON.stringify({ ...parsed.data, branchId })], { type: "application/json" }),
      "request.json",
    );
    upstream.append("photo", photo, photo.type === "image/png" ? "photo.png" : "photo.jpg");
    const driver = validatedFleetResult(
      CreatedDriverSchema,
      await fleetRequest("drivers", token, upstream),
    );
    return NextResponse.json({ driver, branchId }, { status: 202 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { token, branchId } = await requireSelectedBranch(
      Number(request.nextUrl.searchParams.get("branchId")),
    );
    const items = validatedFleetResult(
      DriverListSchema,
      await fleetRequest(`branches/${branchId}/drivers`, token),
      "No se pudo cargar el listado de la sucursal. Inténtalo nuevamente.",
    );
    return NextResponse.json({ items, branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
