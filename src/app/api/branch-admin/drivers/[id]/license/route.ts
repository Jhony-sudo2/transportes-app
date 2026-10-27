import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/api/admin";
import { getBranchWorkspace, validatedFleetResult } from "@/lib/api/branch-workspace";
import { getManagedDriver } from "@/lib/api/branch-drivers";
import { fleetRequest } from "@/lib/api/fleet";
import { driverAvailability } from "@/lib/fleet-availability";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import {
  DriverLicenseRequestSchema,
  LicenseRecordSchema,
  LicenseTypeListSchema,
} from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";

type Context = { params: Promise<{ id: string }> };
async function managedLicense(context: Context, expectedBranch: unknown) {
  const workspace = await getBranchWorkspace();
  const parsed = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
  if (!parsed.success)
    throw new ApplicationError(
      "validation.failed",
      400,
      "El identificador del chofer no es válido.",
    );
  const access = await getManagedDriver(parsed.data, expectedBranch, workspace);
  if (driverAvailability(access.driver).active === null)
    throw new ApplicationError(
      "resource.conflict",
      409,
      "El chofer debe tener una cuenta confirmada y sin operaciones pendientes para cambiar su licencia.",
    );
  if (!access.driver.licenseId || !access.driver.licenseTypeId)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se recibió la referencia de la licencia del chofer. Actualiza el servicio de flota.",
    );
  const [rawLicense, rawTypes] = await Promise.all([
    fleetRequest(`licenses/${access.driver.licenseId}`, access.token),
    fleetRequest("licenses/types", access.token),
  ]);
  const license = validatedFleetResult(LicenseRecordSchema, rawLicense);
  const types = validatedFleetResult(LicenseTypeListSchema, rawTypes);
  if (
    license.id !== access.driver.licenseId ||
    !types.some((type) => type.id === access.driver.licenseTypeId && type.name === license.tipo)
  )
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo verificar la licencia del chofer. Actualiza el listado.",
    );
  return { ...access, license, types };
}
export async function GET(request: NextRequest, context: Context) {
  try {
    const { license, driver, types, branchId } = await managedLicense(
      context,
      Number(request.nextUrl.searchParams.get("branchId")),
    );
    return NextResponse.json({
      branchId,
      types,
      license: {
        number: license.number,
        expirationDate: license.expirationDate,
        licenseType: driver.licenseTypeId,
      },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = DriverLicenseRequestSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    const { branchId: expectedBranch, ...data } = parsed.data;
    const { license, driver, types, branchId, token } = await managedLicense(
      context,
      expectedBranch,
    );
    if (data.expirationDate < license.expirationDate)
      throw new ApplicationError(
        "validation.failed",
        400,
        "El vencimiento no puede ser anterior al de la licencia actual.",
      );
    const type = types.find((item) => item.id === data.licenseType);
    if (!type)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Selecciona un tipo de licencia del catálogo.",
      );
    const saved = validatedFleetResult(
      LicenseRecordSchema,
      await fleetRequest(`licenses/${license.id}`, token, data, "PUT"),
      "No se pudo confirmar la actualización de la licencia. Actualiza el listado.",
    );
    if (
      saved.id !== license.id ||
      saved.number !== data.number ||
      saved.expirationDate !== data.expirationDate ||
      saved.tipo !== type.name
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma la licencia solicitada. Actualiza el listado.",
      );
    return NextResponse.json({
      branchId,
      item: {
        ...driver,
        number: saved.number,
        expirationDate: saved.expirationDate,
        licenseTypeName: saved.tipo,
        licenseTypeId: type.id,
      },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
