import "server-only";
import type { NextRequest } from "next/server";
import { fleetPhotoError } from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";

export async function readBusMultipart(
  request: NextRequest,
  photoRequired: boolean,
  partName: "request" | "data" = "request",
) {
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
      "Envía los datos y la fotografía del bus.",
    );
  }
  if (
    [...form.keys()].some((key) => ![partName, "photo"].includes(key)) ||
    form.getAll(partName).length !== 1 ||
    form.getAll("photo").length > 1
  )
    throw new ApplicationError(
      "validation.failed",
      400,
      "Envía únicamente los datos del bus y una fotografía.",
    );
  const part = form.get(partName);
  let raw: unknown;
  try {
    if (!part || (typeof part === "string" ? part.length : part.size) > 16384) throw new Error();
    raw = JSON.parse(typeof part === "string" ? part : await part.text());
  } catch {
    throw new ApplicationError("validation.failed", 400, "Los datos del bus no son válidos.");
  }
  const file = form.get("photo");
  if (typeof file === "string")
    throw new ApplicationError("validation.failed", 400, "Selecciona una fotografía JPG o PNG.");
  const photo = file && file.size > 0 ? file : null;
  if (photoRequired || photo) {
    const error = fleetPhotoError(photo);
    if (error)
      throw new ApplicationError(
        "validation.failed",
        photo && photo.size > 1024 * 1024 ? 413 : 400,
        error,
      );
  }
  if (photo) {
    const bytes = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
    const png =
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!(photo.type === "image/png" && png) && !(photo.type === "image/jpeg" && jpeg))
      throw new ApplicationError(
        "validation.failed",
        400,
        "El archivo no es una fotografía JPG o PNG válida.",
      );
  }
  return { raw, photo };
}
export function busMultipart(
  data: unknown,
  photo: File | null,
  partName: "request" | "data" = "request",
) {
  const body = new FormData();
  body.append(
    partName,
    new Blob([JSON.stringify(data)], { type: "application/json" }),
    "request.json",
  );
  if (photo) body.append("photo", photo, photo.type === "image/png" ? "photo.png" : "photo.jpg");
  return body;
}
