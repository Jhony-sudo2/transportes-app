import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as V from "@/lib/validators/rentals";
import { OperationKeySchema } from "@/lib/validators/commerce";
import { ManagedBranchIdSchema as id } from "@/lib/validators/branch-context";
import { BranchListSchema } from "@/lib/validators/branch";
import { BusTypeListSchema } from "@/lib/validators/bus-type";
import { BusListSchema, DriverListSchema } from "@/lib/validators/fleet-resources";
import { busAvailability, driverAvailability } from "@/lib/fleet-availability";
import { operationsAccess } from "./operations-access";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "./transport-service";
import { adminErrorResponse } from "./admin";
import { ApplicationError } from "@/types/error";
import {
  TripRecordSchema,
  TripDepartureSchema,
  TripArrivalSchema,
  TripListSchema,
} from "@/lib/validators/journey";
import { confirmedTrip } from "./journey";
import type { RentalQuote } from "@/types/rentals";
type Access = Awaited<ReturnType<typeof operationsAccess>>;
const ADMINS = ["ADMIN", "SUCURSAL_ADMIN"] as const;
function fail(detail: string, status = 403): never {
  throw new ApplicationError("auth.forbidden", status, detail);
}
const parseId = (value: string | undefined) => checkedBody(id, Number(value));
async function body<T>(r: NextRequest, s: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return checkedBody(s, await r.json().catch(() => null));
}
async function command(
  r: NextRequest,
  path: string,
  a: Access,
  input: unknown,
  method: "POST" | "PUT" = "POST",
) {
  return transportService(path, {
    ...a,
    body: input,
    method,
    idempotencyKey: checkedBody(OperationKeySchema, r.headers.get("Idempotency-Key")),
  });
}
function projection(q: RentalQuote, a: Access) {
  if (a.user.role.name === "CUSTOMER" || a.user.role.name === "CAJERO") {
    const { estimatedCost: _, priceComponents: __, ...safe } = q;
    return safe;
  }
  return q;
}
async function quote(qid: number, a: Access) {
  if (a.user.role.name === "CUSTOMER") {
    const mine = serviceResult(
      V.RentalQuoteSchema.array(),
      await transportService("rental-quotes/me", a),
    );
    if (!mine.some((q) => q.quoteId === qid)) fail("La cotización no pertenece a tu cuenta.");
  }
  const q = serviceResult(V.RentalQuoteSchema, await transportService(`rental-quotes/${qid}`, a));
  if (q.quoteId !== qid) fail("No se pudo verificar la cotización.", 502);
  if (
    a.user.role.name === "SUCURSAL_ADMIN" &&
    q.managingBranchId !== null &&
    q.managingBranchId !== a.branchId
  )
    fail("La cotización pertenece a otra sucursal.");
  if (
    a.user.role.name === "CUSTOMER" &&
    a.user.customerId != null &&
    q.customerId !== a.user.customerId
  )
    fail("La cotización no corresponde a tu Customer.");
  return q;
}
async function contract(rid: number, a: Access) {
  if (a.user.role.name === "CUSTOMER") {
    const mine = serviceResult(
      V.RentalContractSchema.array(),
      await transportService("rentals/me", a),
    );
    if (!mine.some((r) => r.rentalId === rid)) fail("El alquiler no pertenece a tu cuenta.");
  }
  const r = serviceResult(V.RentalContractSchema, await transportService(`rentals/${rid}`, a));
  if (r.rentalId !== rid) fail("No se pudo verificar el alquiler.", 502);
  if (a.user.role.name === "SUCURSAL_ADMIN" && r.managingBranchId !== a.branchId)
    fail("El alquiler no pertenece a tu sucursal gestora.");
  if (
    a.user.role.name === "CUSTOMER" &&
    a.user.customerId != null &&
    r.customerId !== a.user.customerId
  )
    fail("El alquiler no corresponde a tu Customer.");
  return r;
}
export async function rentalOperation(request: NextRequest, segments: string[]) {
  try {
    const path = segments.join("/"),
      method = request.method;
    if (method !== "GET") requireSameOrigin(request);
    if (path === "operating-trips" && method === "GET") {
      const a = await operationsAccess(request, ["SUCURSAL_ADMIN"], true),
        trips = serviceResult(
          TripListSchema,
          await transportService(`trips?operatingBranchId=${a.branchId}&tripType=PRIVATE`, a),
        );
      if (trips.some((t) => t.tripType !== "PRIVATE" || t.operatingBranchId !== a.branchId))
        fail("El listado contiene viajes privados de otra sucursal.");
      return NextResponse.json(trips);
    }
    if (
      segments[0] === "contracts" &&
      segments[2] === "legs" &&
      segments.length === 5 &&
      ["departure", "arrival"].includes(segments[4] ?? "") &&
      method === "POST"
    ) {
      const a = await operationsAccess(request, ["SUCURSAL_ADMIN"], true),
        rid = parseId(segments[1]),
        tid = parseId(segments[3]),
        trip = serviceResult(TripRecordSchema, await transportService(`trips/${tid}`, a));
      if (
        trip.tripId !== tid ||
        trip.rentalId !== rid ||
        trip.tripType !== "PRIVATE" ||
        trip.operatingBranchId !== a.branchId
      )
        fail("El tramo no corresponde a tu sucursal operativa.");
      if (segments[4] === "departure") {
        if (trip.status !== "SCHEDULED" || trip.departure || !trip.driverId || !trip.busId)
          fail("El tramo no está listo para iniciar.", 409);
        const input = await body(request, TripDepartureSchema),
          updated = await confirmedTrip(
            await transportService(`trips/${tid}/departure`, { ...a, body: input }),
            a,
            tid,
          );
        if (
          updated.status !== "IN_TRANSIT" ||
          updated.departure?.startKm !== input.startKm ||
          Date.parse(updated.departure.actualDepartureAt) !== Date.parse(input.actualDepartureAt) ||
          updated.rentalId !== rid ||
          updated.operatingBranchId !== a.branchId ||
          updated.busId !== trip.busId ||
          updated.driverId !== trip.driverId
        )
          fail("No se pudo confirmar la salida del tramo.", 502);
        return NextResponse.json(updated);
      }
      if (trip.status !== "IN_TRANSIT" || !trip.departure || trip.arrival)
        fail("El tramo no está en tránsito.", 409);
      const input = await body(request, TripArrivalSchema);
      if (
        input.endKm < trip.departure.startKm ||
        Date.parse(input.actualArrivalAt) < Date.parse(trip.departure.actualDepartureAt)
      )
        fail("Llegada incompatible con la salida del tramo.", 400);
      const updated = await confirmedTrip(
        await transportService(`trips/${tid}/arrival`, { ...a, body: input }),
        a,
        tid,
      );
      if (
        updated.status !== "COMPLETED" ||
        updated.arrival?.endKm !== input.endKm ||
        updated.arrival.fuelCost !== input.fuelCost ||
        Date.parse(updated.arrival.actualArrivalAt) !== Date.parse(input.actualArrivalAt) ||
        updated.rentalId !== rid ||
        updated.operatingBranchId !== a.branchId ||
        updated.busId !== trip.busId ||
        updated.driverId !== trip.driverId
      )
        fail("No se pudo confirmar la llegada del tramo.", 502);
      return NextResponse.json(updated);
    }
    if (path === "context" && method === "GET") {
      const a = await operationsAccess(
        request,
        ["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "CAJERO"],
        true,
      );
      const types = serviceResult(BusTypeListSchema, await transportService("bus-types", a));
      const branches =
        a.user.role.name === "CUSTOMER" || a.user.role.name === "CAJERO"
          ? []
          : serviceResult(BranchListSchema, await transportService("branches", a));
      return NextResponse.json({ busTypes: types, branches, branchId: a.branchId ?? null });
    }
    if (path === "resources" && method === "GET") {
      const a = await operationsAccess(request, [...ADMINS], true),
        branchId =
          a.branchId ?? checkedBody(id, Number(request.nextUrl.searchParams.get("branchId")));
      const branches = serviceResult(BranchListSchema, await transportService("branches", a));
      if (!branches.some((b) => b.id === branchId && b.active === true))
        fail("La sucursal de recursos no está habilitada.");
      const [buses, drivers] = await Promise.all([
        transportService(`branches/${branchId}/buses`, a),
        transportService(`branches/${branchId}/drivers`, a),
      ]);
      return NextResponse.json({
        branchId,
        buses: serviceResult(BusListSchema, buses),
        drivers: serviceResult(DriverListSchema, drivers),
      });
    }
    if (path === "policy" && ["GET", "PUT"].includes(method)) {
      const a = await operationsAccess(request, method === "PUT" ? ["ADMIN"] : [...ADMINS]);
      return NextResponse.json(
        serviceResult(
          V.RentalPolicySchema,
          method === "GET"
            ? await transportService("rental-quote-policy", a)
            : await command(
                request,
                "rental-quote-policy",
                a,
                await body(request, V.RentalPolicySchema),
                "PUT",
              ),
        ),
      );
    }
    if (path === "quotes" && method === "GET") {
      const a = await operationsAccess(request, ["CUSTOMER", ...ADMINS, "CAJERO"], true);
      let upstream = "rental-quotes/me";
      if (a.user.role.name === "CAJERO") {
        const ref = request.nextUrl.searchParams.get("reference");
        const q = new URLSearchParams();
        if (ref) q.set("reference", checkedBody(z.string().trim().min(1).max(128), ref));
        upstream = `rental-quotes/payable?${q}`;
      } else if (a.user.role.name !== "CUSTOMER") {
        const params = new URLSearchParams();
        if (a.branchId) params.set("managingBranchId", String(a.branchId));
        const status = request.nextUrl.searchParams.get("status");
        if (status)
          params.set(
            "status",
            checkedBody(z.enum(["PENDING_APPROVAL", "APPROVED", "PAID"]), status),
          );
        upstream = `rental-quotes/admin?${params}`;
      }
      const quotes = serviceResult(
        V.RentalQuoteSchema.array(),
        await transportService(upstream, a),
      );
      if (
        a.user.role.name === "SUCURSAL_ADMIN" &&
        quotes.some((q) => q.managingBranchId !== null && q.managingBranchId !== a.branchId)
      )
        fail("El listado contiene cotizaciones de otra sucursal.");
      if (
        a.user.role.name === "CAJERO" &&
        quotes.some((q) => q.status !== "APPROVED" || Date.parse(q.expiresAt) <= Date.now())
      )
        fail("El servicio no devolvió cotizaciones cobrables.", 502);
      if (
        a.user.role.name === "CUSTOMER" &&
        a.user.customerId != null &&
        quotes.some((q) => q.customerId !== a.user.customerId)
      )
        fail("El listado contiene cotizaciones de otro Customer.");
      return NextResponse.json(quotes.map((q) => projection(q, a)));
    }
    if (path === "quotes" && method === "POST") {
      const a = await operationsAccess(request, ["CUSTOMER"]),
        input = await body(request, V.CheckedRentalQuoteInputSchema);
      const q = serviceResult(
        V.RentalQuoteSchema,
        await command(request, "rental-quotes", a, input),
      );
      if (
        q.status !== "PENDING_APPROVAL" ||
        q.busTypeId !== input.busTypeId ||
        (a.user.customerId != null && q.customerId !== a.user.customerId)
      )
        fail("No se pudo confirmar tu solicitud.", 502);
      return NextResponse.json(projection(q, a), { status: 201 });
    }
    if (path === "quotes/admin" && method === "POST") {
      const a = await operationsAccess(request, [...ADMINS], true),
        input = await body(request, V.AdminQuoteInputSchema);
      if (a.branchId && input.managingBranchId !== a.branchId)
        fail("La gestora debe ser tu sucursal seleccionada.");
      const q = serviceResult(
        V.RentalQuoteSchema,
        await command(request, "rental-quotes/admin", a, input),
      );
      if (
        q.status !== "APPROVED" ||
        q.finalPrice !== input.finalPrice ||
        q.managingBranchId !== input.managingBranchId
      )
        fail("No se pudo confirmar la cotización aprobada.", 502);
      return NextResponse.json(q, { status: 201 });
    }
    if (segments[0] === "quotes" && segments.length === 2 && method === "GET") {
      const a = await operationsAccess(request, ["CUSTOMER", ...ADMINS], true);
      return NextResponse.json(projection(await quote(parseId(segments[1]), a), a));
    }
    if (
      segments[0] === "quotes" &&
      segments[2] === "approve" &&
      segments.length === 3 &&
      method === "POST"
    ) {
      const a = await operationsAccess(request, [...ADMINS], true),
        qid = parseId(segments[1]),
        existing = await quote(qid, a),
        input = await body(request, V.QuoteApprovalSchema);
      if (a.branchId && input.managingBranchId !== a.branchId)
        fail("La gestora debe ser la sucursal seleccionada.");
      if (
        Date.parse(input.outboundArrivalEstimateAt) <= Date.parse(existing.departureAt) ||
        (existing.returnDepartureAt &&
          (!input.estimatedReturnKm ||
            !input.returnArrivalEstimateAt ||
            Date.parse(input.outboundArrivalEstimateAt) >= Date.parse(existing.returnDepartureAt) ||
            Date.parse(input.returnArrivalEstimateAt) <= Date.parse(existing.returnDepartureAt)))
      )
        fail("Revisa kilómetros y horarios de ambos tramos.", 400);
      const updated = serviceResult(
        V.RentalQuoteSchema,
        await command(request, `rental-quotes/${qid}/approve`, a, input),
      );
      if (
        updated.quoteId !== qid ||
        updated.status !== "APPROVED" ||
        updated.finalPrice !== input.finalPrice ||
        updated.managingBranchId !== input.managingBranchId
      )
        fail("No se pudo confirmar la aprobación.", 502);
      return NextResponse.json(updated);
    }
    if (path === "payments" && method === "POST") {
      const a = await operationsAccess(request, ["CUSTOMER", "CAJERO"], true),
        input = await body(request, V.RentalPaymentInputSchema),
        cash = a.user.role.name === "CAJERO";
      if (!cash) {
        if (input.contactEmail !== undefined)
          fail("El correo de cuenta se resuelve desde tu identidad.", 400);
        await quote(input.quoteId, a);
      }
      const result = serviceResult(
        V.RentalPaymentSchema,
        await command(request, `payments/rentals${cash ? "/counter" : ""}`, a, input),
      );
      if (
        result.quoteId !== input.quoteId ||
        (cash && (result.sourceBranchId !== a.branchId || !result.revenueBranchId))
      )
        fail("No se pudo confirmar el pago y sus sucursales.", 502);
      return NextResponse.json(result, { status: 201 });
    }
    if (path === "contracts" && method === "GET") {
      const a = await operationsAccess(request, ["CUSTOMER"]);
      const rentals = serviceResult(
        V.RentalContractSchema.array(),
        await transportService("rentals/me", a),
      );
      if (a.user.customerId != null && rentals.some((r) => r.customerId !== a.user.customerId))
        fail("El listado no corresponde a tu Customer.");
      return NextResponse.json(rentals);
    }
    if (segments[0] === "contracts" && segments.length === 2 && method === "GET")
      return NextResponse.json(
        await contract(
          parseId(segments[1]),
          await operationsAccess(request, ["CUSTOMER", ...ADMINS], true),
        ),
      );
    if (
      segments[0] === "contracts" &&
      segments[2] === "assign" &&
      segments.length === 3 &&
      method === "POST"
    ) {
      const a = await operationsAccess(request, [...ADMINS], true),
        rid = parseId(segments[1]),
        r = await contract(rid, a),
        q = await quote(r.quoteId, a),
        input = await body(request, V.RentalAssignSchema);
      if (r.status !== "PAID" || r.legs.some((l) => l.departure !== null))
        fail("Solo se asignan recursos a un alquiler pagado sin iniciar.", 409);
      if (!!input.return !== r.legs.some((l) => l.legType === "RETURN"))
        fail("Debes asignar exactamente los tramos contratados.", 400);
      const branches = serviceResult(BranchListSchema, await transportService("branches", a));
      for (const chosen of [input.outbound, ...(input.return ? [input.return] : [])]) {
        let found = false;
        for (const branch of branches.filter(
          (b) => b.active === true && (!a.branchId || b.id === a.branchId),
        )) {
          const buses = serviceResult(
            BusListSchema,
            await transportService(`branches/${branch.id}/buses`, a),
          );
          const bus = buses.find((b) => b.id === chosen.busId);
          if (!bus) continue;
          const drivers = serviceResult(
            DriverListSchema,
            await transportService(`branches/${branch.id}/drivers`, a),
          );
          const driver = drivers.find((d) => d.id === chosen.driverId);
          found =
            bus.busTypeId === q.busTypeId &&
            bus.rentalEnabled === true &&
            busAvailability(bus).active === true &&
            !!driver &&
            driverAvailability(driver).active === true;
          break;
        }
        if (!found)
          fail(
            "Selecciona bus habilitado del tipo contratado y chofer confirmado de su misma sucursal.",
            422,
          );
      }
      const updated = serviceResult(
        V.RentalContractSchema,
        await command(request, `rentals/${rid}/assign`, a, input),
      );
      if (
        updated.rentalId !== rid ||
        updated.invoiceId !== r.invoiceId ||
        updated.quoteId !== r.quoteId ||
        updated.customerId !== r.customerId ||
        updated.managingBranchId !== r.managingBranchId ||
        updated.status !== "PAID" ||
        updated.legs.length !== r.legs.length ||
        r.legs.some(
          (old) =>
            !updated.legs.some(
              (current) => current.tripId === old.tripId && current.legType === old.legType,
            ),
        ) ||
        updated.legs.some((l) => {
          const selected = l.legType === "OUTBOUND" ? input.outbound : input.return;
          return (
            !selected ||
            l.busId !== selected.busId ||
            l.driverId !== selected.driverId ||
            l.status !== "SCHEDULED" ||
            (selected.driverBaseSalary !== undefined &&
              l.driverBaseSalarySnapshot !== selected.driverBaseSalary)
          );
        })
      )
        fail("No se pudo confirmar la asignación completa.", 502);
      return NextResponse.json(updated);
    }
    if (
      segments[0] === "contracts" &&
      segments[2] === "cancel" &&
      segments.length === 3 &&
      method === "POST"
    ) {
      const a = await operationsAccess(request, ["CUSTOMER", ...ADMINS], true),
        rid = parseId(segments[1]),
        r = await contract(rid, a),
        input = await body(request, V.RentalCancelSchema);
      if (a.user.role.name === "CUSTOMER" && input.cause !== "VOLUNTARY")
        fail("Tu cuenta solo puede solicitar cancelación voluntaria.");
      if (r.legs.some((l) => l.departure !== null))
        fail("No se puede cancelar el alquiler después de iniciar alguno de sus tramos.", 409);
      const preview = r.cancellationPreview?.[input.cause];
      if (!preview?.eligible)
        fail(
          preview?.reason ??
            "El servicio debe informar el importe exacto antes de confirmar la cancelación.",
          422,
        );
      const result = serviceResult(
        V.RentalCancelResultSchema,
        await command(request, `rentals/${rid}/cancel`, a, input),
      );
      if (result.rentalId !== rid) fail("No se pudo confirmar la cancelación.", 502);
      return NextResponse.json(result, { status: result.status === "CANCELLING" ? 202 : 200 });
    }
    fail("Operación no disponible.", 404);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
