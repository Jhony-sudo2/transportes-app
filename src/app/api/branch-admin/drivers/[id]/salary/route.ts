import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/api/admin";
import { getBranchWorkspace, validatedFleetResult } from "@/lib/api/branch-workspace";
import { getManagedDriver } from "@/lib/api/branch-drivers";
import { fleetRequest } from "@/lib/api/fleet";
import { driverAvailability } from "@/lib/fleet-availability";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import {
  DriverSalaryRequestSchema,
  DriverListRecordSchema,
} from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    if (!id.success)
      return NextResponse.json(
        { detail: "El identificador del chofer no es válido." },
        { status: 400 },
      );
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = DriverSalaryRequestSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const { driver, token, branchId } = await getManagedDriver(
      id.data,
      parsed.data.branchId,
      workspace,
    );
    if (driverAvailability(driver).active === null)
      throw new ApplicationError(
        "resource.conflict",
        409,
        "El chofer debe tener una cuenta confirmada y sin operaciones pendientes para cambiar su salario.",
      );
    const item = validatedFleetResult(
      DriverListRecordSchema,
      await fleetRequest(
        `drivers/${id.data}/salary`,
        token,
        { baseSalary: parsed.data.baseSalary },
        "PATCH",
      ),
      "No se pudo confirmar el salario. Actualiza el listado antes de volver a guardar.",
    );
    if (item.id !== id.data || item.baseSalary !== parsed.data.baseSalary)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma el salario solicitado. Actualiza el listado.",
      );
    return NextResponse.json({ item, branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
