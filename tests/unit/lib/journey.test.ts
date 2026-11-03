// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as routes, POST as createRoute } from "@/app/api/branch-admin/routes/route";
import {
  DELETE as deleteRoute,
  PATCH as editRoute,
} from "@/app/api/branch-admin/routes/[id]/route";
import { GET as trips, POST as scheduleTrip } from "@/app/api/branch-admin/trips/route";
import { GET as assignedTrips } from "@/app/api/driver/trips/route";
import { GET as searchTrips } from "@/app/api/journey/trips/route";
import { GET as publicBranches } from "@/app/api/journey/branches/route";
import { tripAction } from "@/lib/api/trip-actions";
import {
  CivilDateSchema,
  TripRecordSchema,
  TripScheduleInputSchema,
} from "@/lib/validators/journey";
import { guatemalaDateTime, guatemalaDate, inputToInstant } from "@/lib/transport-time";
import { middleware } from "@/middleware";
const mocks = vi.hoisted(() => ({ session: vi.fn(), cookie: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
const user = {
  id: 70,
  isActive: true,
  resetPassword: false,
  branchIds: [2],
  role: { id: 3, name: "SUCURSAL_ADMIN" },
};
const route = {
  routeId: 10,
  originBranchId: 2,
  destinationBranchId: 3,
  distanceKm: 100,
  ticketPrice: 50,
};
const branch = { id: 2, name: "Central", active: true, latitude: 14.6, longitude: -90.5 };
const driver = {
  id: 8,
  userId: 70,
  name: "Juan",
  lastName: "Chofer",
  email: "driver@example.com",
  status: "ACTIVE",
  photo: "",
};
const bus = {
  id: 5,
  plateNumber: "C123ABC",
  brand: "Volvo",
  model: "Touring",
  state: "AVAILABLE",
  photo: "",
};
const schedule = {
  routeId: 10,
  busId: 5,
  driverId: 8,
  scheduledDepartureAt: "2027-01-02T09:00:00-06:00",
  scheduledArrivalAt: "2027-01-02T12:00:00-06:00",
  driverBaseSalary: 0,
};
const trip = {
  tripId: 20,
  tripType: "REGULAR",
  status: "SCHEDULED",
  route,
  operatingBranchId: 2,
  busId: 5,
  driverId: 8,
  scheduledDepartureAt: schedule.scheduledDepartureAt,
  scheduledArrivalAt: schedule.scheduledArrivalAt,
  price: 50,
  driverBaseSalarySnapshot: 0,
  departure: null,
  arrival: null,
};
const departure = { actualDepartureAt: "2027-01-02T08:30:00-06:00", startKm: 1000 };
const transit = { ...trip, status: "IN_TRANSIT", departure };
const arrival = { actualArrivalAt: "2027-01-02T12:00:00-06:00", endKm: 1100, fuelCost: 0 };
const completed = { ...transit, status: "COMPLETED", arrival };
const context = (action = "departure", id = "20") => ({ params: Promise.resolve({ id, action }) });
function request(data?: unknown, query = "branchId=2", origin = "http://localhost:3000") {
  return new NextRequest(
    `http://localhost:3000/api/branch-admin/trips?${query}`,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
}
function responses(...values: unknown[]) {
  for (const value of values)
    mocks.fetch.mockResolvedValueOnce(value instanceof Response ? value : Response.json(value));
}
function asDriver() {
  mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
}
describe("Journey: alcance, operación y contratos de la etapa 3", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(user);
    mocks.cookie.mockImplementation((key: string) => ({
      value: key === "access_token" ? "secret-token" : "2",
    }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("lista solo rutas de la sucursal elegida y envía contexto autorizado", async () => {
    responses([route]);
    expect(await (await routes(request())).json()).toEqual([route]);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/routes\?originBranchId=2$/);
    expect(mocks.fetch.mock.calls[0]?.[1].headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "X-Operation-Branch-Id": "2",
    });
  });
  it("rechaza listas de rutas de otro origen", async () => {
    responses([{ ...route, originBranchId: 3 }]);
    expect((await routes(request())).status).toBe(403);
  });
  it.each(["ADMIN", "CUSTOMER", "DRIVER", "CAJERO"])(
    "no concede operación de sucursal a %s",
    async (name) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 1, name } });
      expect((await routes(request())).status).toBe(403);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("rechaza una sucursal cambiada antes de escribir", async () => {
    expect((await createRoute(request(route, "branchId=3"))).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("exige origen de la petición y no envía escrituras externas", async () => {
    expect((await createRoute(request({}, "branchId=2", "https://foreign.invalid"))).status).toBe(
      403,
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("crea ruta con coordenadas válidas y origen propio", async () => {
    const { routeId: _, ...input } = route;
    responses([{ branchId: 2, name: "Central" }, { branchId: 3, name: "Otra" }], branch, { ...branch, id: 3 }, route);
    expect((await createRoute(request(input))).status).toBe(201);
    expect(JSON.parse(mocks.fetch.mock.calls[3]?.[1].body)).toEqual(input);
  });
  it.each([
    { originBranchId: 3 },
    { destinationBranchId: 2 },
    { destinationBranchId: 99 },
    { distanceKm: 0 },
    { ticketPrice: -1 },
    { ticketPrice: 1.123 },
    { routeId: 10 },
  ])("no registra ruta inválida %j", async (override) => {
    const { routeId: _, ...input } = route;
    responses([branch, { ...branch, id: 3 }]);
    expect((await createRoute(request({ ...input, ...override }))).status).toBeGreaterThanOrEqual(
      400,
    );
    expect(mocks.fetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });
  it("requiere coordenadas válidas en ambos extremos", async () => {
    const { routeId: _, ...input } = route;
    responses([{ branchId: 2, name: "Central" }, { branchId: 3, name: "Sin coordenadas" }], branch, { id: 3, name: "Sin coordenadas", active: true });
    expect((await createRoute(request(input))).status).toBe(422);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
  it("conserva conflicto ROUTE_HAS_TRIPS sin borrar ni reintentar", async () => {
    responses(
      [route],
      Response.json({ detail: "La ruta tiene viajes", code: "ROUTE_HAS_TRIPS" }, { status: 409 }),
    );
    const response = await deleteRoute(request({}), context("", "10"));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      detail: "La ruta tiene viajes",
      code: "ROUTE_HAS_TRIPS",
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("confirma eliminación con 204 y verifica pertenencia antes de borrar", async () => {
    responses([route], new Response(null, { status: 204 }));
    expect((await deleteRoute(request({}), context("", "10"))).status).toBe(204);
    expect(mocks.fetch.mock.calls[1]?.[1].method).toBe("DELETE");
  });
  it("no permite editar una ruta ausente del ámbito", async () => {
    responses([]);
    expect((await editRoute(request({}), context("", "99"))).status).toBe(404);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("programa con recursos propios y salario cero confirmado", async () => {
    responses([route], [bus], [driver], trip);
    expect((await scheduleTrip(request(schedule))).status).toBe(201);
    expect(JSON.parse(mocks.fetch.mock.calls[3]?.[1].body)).toEqual(schedule);
  });
  it.each([{ busId: 99 }, { driverId: 99 }])(
    "rechaza recursos que no pertenecen a la sede %j",
    async (override) => {
      responses([route], [bus], [driver]);
      expect((await scheduleTrip(request({ ...schedule, ...override }))).status).toBe(422);
      expect(mocks.fetch).toHaveBeenCalledTimes(3);
    },
  );
  it("no programa con un conductor de cuenta aún pendiente", async () => {
    responses([route], [bus], [{ ...driver, status: "PENDING", userId: null }]);
    expect((await scheduleTrip(request(schedule))).status).toBe(422);
  });
  it.each([
    { tripType: "PRIVATE" },
    { price: 1 },
    { scheduledArrivalAt: schedule.scheduledDepartureAt },
    { driverBaseSalary: -1 },
  ])("rechaza campos o programación incoherente %j", async (override) => {
    expect((await scheduleTrip(request({ ...schedule, ...override }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("no anuncia programación si la respuesta cambió el importe o ámbito", async () => {
    responses([route], [bus], [driver], { ...trip, driverBaseSalarySnapshot: 99 });
    expect((await scheduleTrip(request(schedule))).status).toBe(502);
  });
  it("no acepta viajes de otra sede en la lista operativa", async () => {
    responses({ content: [{ ...trip, operatingBranchId: 3 }], page: 0, size: 100, totalElements: 1 });
    expect((await trips(request())).status).toBe(403);
  });
  it("busca las asignaciones usando ID de Fleet, distinto de User", async () => {
    asDriver();
    responses(driver, [trip]);
    expect(await (await assignedTrips()).json()).toEqual([trip]);
    expect(mocks.fetch.mock.calls[1]?.[0]).toMatch(/trips\/assigned\?driverId=8$/);
  });
  it("rechaza un listado con viajes de otro chofer", async () => {
    asDriver();
    responses(driver, [{ ...trip, driverId: 9 }]);
    expect((await assignedTrips()).status).toBe(403);
  });
  it("el chofer no puede iniciar el viaje asignado a otro", async () => {
    asDriver();
    responses(driver, { ...trip, driverId: 9 });
    expect((await tripAction(request(departure), context(), "driver")).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("permite salida antes del horario previsto cuando el servidor la confirma", async () => {
    asDriver();
    responses(driver, trip, transit);
    expect((await tripAction(request(departure), context(), "driver")).status).toBe(200);
    expect(JSON.parse(mocks.fetch.mock.calls[2]?.[1].body)).toEqual(departure);
  });
  it.each(["CANCELLING", "CANCELLED"])("no registra salida desde %s", async (status) => {
    responses({ ...trip, status });
    expect((await tripAction(request(departure), context(), "branch")).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("evita salida duplicada", async () => {
    responses(transit);
    expect((await tripAction(request(departure), context(), "branch")).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("conserva rechazo de cierre comercial y no simula salida", async () => {
    responses(
      trip,
      Response.json(
        { detail: "No se pudo cerrar ventas", code: "SALES_CLOSE_FAILED" },
        { status: 503 },
      ),
    );
    expect((await tripAction(request(departure), context(), "branch")).status).toBe(503);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it.each([{ endKm: 999 }, { fuelCost: -1 }, { actualArrivalAt: "2027-01-02T08:00:00-06:00" }])(
    "rechaza llegada inconsistente %j",
    async (override) => {
      responses(transit);
      expect(
        (await tripAction(request({ ...arrival, ...override }), context("arrival"), "branch"))
          .status,
      ).toBe(400);
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("finaliza con combustible cero y valida la respuesta persistida", async () => {
    responses(transit, completed);
    expect((await tripAction(request(arrival), context("arrival"), "branch")).status).toBe(200);
  });
  it("no confirma llegada si el proveedor devuelve otra salida", async () => {
    responses(transit, { ...completed, departure: { ...departure, startKm: 900 } });
    expect((await tripAction(request(arrival), context("arrival"), "branch")).status).toBe(502);
  });
  it("conserva cancelación pendiente como 202 sin declararla finalizada", async () => {
    responses(trip, { tripId: 20, status: "CANCELLING" });
    const response = await tripAction(request({ reason: "Avería" }), context("cancel"), "branch");
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ tripId: 20, status: "CANCELLING" });
  });
  it("requiere motivo para cancelar", async () => {
    responses(trip);
    expect((await tripAction(request({ reason: "  " }), context("cancel"), "branch")).status).toBe(
      400,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["cancel", "driver"])("DRIVER no puede ejecutar %s", async (action) => {
    asDriver();
    responses(driver);
    expect((await tripAction(request({}), context(action), "driver")).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("reasigna chofer sin alterar bus, ruta ni precio histórico", async () => {
    responses(trip, [{ ...driver, id: 9 }], { ...trip, driverId: 9 });
    expect(
      (await tripAction(request({ driverId: 9, driverBaseSalary: 0 }), context("driver"), "branch"))
        .status,
    ).toBe(200);
    expect(mocks.fetch.mock.calls[2]?.[1].method).toBe("PATCH");
  });
  it("no confirma reasignación si se cambió también el bus", async () => {
    responses(trip, [{ ...driver, id: 9 }], { ...trip, driverId: 9, busId: 6 });
    expect((await tripAction(request({ driverId: 9 }), context("driver"), "branch")).status).toBe(
      502,
    );
  });
  it("no confirma reasignación si se alteró el precio del viaje", async () => {
    responses(trip, [{ ...driver, id: 9 }], { ...trip, driverId: 9, price: 99 });
    expect((await tripAction(request({ driverId: 9 }), context("driver"), "branch")).status).toBe(
      502,
    );
  });
  it("no reintenta escrituras tras pérdida de conexión", async () => {
    responses(trip);
    mocks.fetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await tripAction(request(departure), context(), "branch")).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("la búsqueda pública valida fechas y rechaza filtros de ámbito privado", async () => {
    expect((await searchTrips(request(undefined, "date=2027-02-30"))).status).toBe(400);
    expect((await searchTrips(request(undefined, "driverId=8"))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("la búsqueda pública no envía token ni expone información de personas", async () => {
    responses([
      {
        tripId: 20,
        routeId: 10,
        originBranchId: 2,
        destinationBranchId: 3,
        busId: 5,
        departureAt: schedule.scheduledDepartureAt,
        price: 50,
        seatsAvailable: 4,
        customerName: "Privado",
      },
    ]);
    const result = await searchTrips(request(undefined, "originBranchId=2&date=2027-01-02"));
    expect(result.status).toBe(200);
    expect((await result.json())[0]).not.toHaveProperty("customerName");
    expect(mocks.fetch.mock.calls[0]?.[1].headers).not.toHaveProperty("Authorization");
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("acepta disponibilidad no verificada sin exponer datos privados", async () => {
    responses([
      {
        tripId: 3,
        routeId: 1,
        originBranchId: 1,
        destinationBranchId: 2,
        busId: 1,
        departureAt: "2026-11-14T14:00:00Z",
        price: 75,
        seatsAvailable: null,
        customerName: "Privado",
      },
    ]);
    const result = await searchTrips(request(undefined, "date=2026-11-14"));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual([
      {
        tripId: 3,
        routeId: 1,
        originBranchId: 1,
        destinationBranchId: 2,
        busId: 1,
        departureAt: "2026-11-14T14:00:00Z",
        price: 75,
        seatsAvailable: null,
      },
    ]);
  });
  it("reduce catálogo público de sucursales a ID y nombre", async () => {
    responses([{ branchId: branch.id, name: branch.name, phone: "55555555" }]);
    expect(await (await publicBranches()).json()).toEqual([{ id: 2, name: "Central" }]);
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/branches\/catalog$/);
  });
  it.each([
    "/trips",
    "/driver/trips",
    "/branch-admin/routes",
    "/branch-admin/trips",
    "/api/journey/trips",
    "/api/driver/trips/20/arrival",
    "/api/branch-admin/trips/20/cancel",
  ])("habilita middleware sin cachear %s", (path) => {
    const response = middleware(new NextRequest("http://localhost:3000" + path));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
describe("Fechas civiles y coherencia del viaje", () => {
  it("mantiene día local aunque UTC ya sea el día siguiente", () => {
    const now = new Date("2027-01-03T03:05:00Z");
    expect(guatemalaDate(now)).toBe("2027-01-02");
    expect(guatemalaDateTime(now)).toBe("2027-01-02T21:05");
    expect(inputToInstant("2027-01-02T21:05")).toBe("2027-01-02T21:05:00-06:00");
  });
  it("valida días reales y bisiestos", () => {
    expect(CivilDateSchema.safeParse("2028-02-29").success).toBe(true);
    expect(CivilDateSchema.safeParse("2027-02-29").success).toBe(false);
  });
  it("exige zona explícita y horario creciente", () => {
    expect(
      TripScheduleInputSchema.safeParse({
        ...schedule,
        scheduledDepartureAt: "2027-01-02T09:00:00",
      }).success,
    ).toBe(false);
    expect(
      TripScheduleInputSchema.safeParse({
        ...schedule,
        scheduledArrivalAt: schedule.scheduledDepartureAt,
      }).success,
    ).toBe(false);
  });
  it.each([
    { ...trip, status: "COMPLETED" },
    { ...trip, departure },
    { ...transit, arrival },
    { ...completed, arrival: { ...arrival, endKm: 999 } },
  ])("rechaza respuestas de estado contradictorio", (value) => {
    expect(TripRecordSchema.safeParse(value).success).toBe(false);
  });
});

describe("Confirmación de respuestas abreviadas del SSOT", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(user);
    mocks.cookie.mockImplementation((key: string) => ({
      value: key === "access_token" ? "secret-token" : "2",
    }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("acepta salida abreviada consultando el detalle actualizado", async () => {
    responses(trip, { tripId: 20, status: "IN_TRANSIT", departure }, transit);
    const response = await tripAction(request(departure), context(), "branch");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(transit);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(mocks.fetch.mock.calls[2]?.[1].method).toBe("GET");
  });
  it("mantiene el resultado incierto si falla la consulta posterior a la escritura", async () => {
    responses(
      trip,
      { tripId: 20, status: "IN_TRANSIT", departure },
      Response.json({}, { status: 404 }),
    );
    expect((await tripAction(request(departure), context(), "branch")).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
  it("no presupone habilitación de sucursales si falta su estado", async () => {
    const { routeId: _, ...input } = route;
    responses([{ branchId: 2, name: "Central" }, { branchId: 3, name: "Otra" }], branch, { ...branch, id: 3, active: undefined });
    expect((await createRoute(request(input))).status).toBe(422);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
  it("admite metadatos del proveedor sin reenviarlos al navegador", async () => {
    responses(trip, {
      ...transit,
      route: { ...route, createdAt: "2027-01-01" },
      departure: { ...departure, registeredByUserId: 70 },
    });
    const response = await tripAction(request(departure), context(), "branch");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(transit);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("confirma alta abreviada mediante GET y conserva los valores del formulario", async () => {
    responses(
      [route],
      [bus],
      [driver],
      { tripId: 20, status: "SCHEDULED", route, busId: 5, driverId: 8, price: 50 },
      trip,
    );
    expect((await scheduleTrip(request(schedule))).status).toBe(201);
    expect(mocks.fetch).toHaveBeenCalledTimes(5);
  });
  it("no confirma salida con contexto operativo de otra sucursal", async () => {
    responses(trip, { ...transit, operatingBranchId: 3 });
    expect((await tripAction(request(departure), context(), "branch")).status).toBe(502);
  });
  it("distingue un tramo privado de un viaje regular sin mezclar tarifa ni ruta", () => {
    expect(TripRecordSchema.safeParse({ ...trip, rentalId: 1 }).success).toBe(false);
    const privateTrip = { ...trip, tripType: "PRIVATE", rentalId: 1, route: null, price: null };
    expect(TripRecordSchema.safeParse(privateTrip).success).toBe(true);
    expect(TripRecordSchema.safeParse({ ...privateTrip, price: 50 }).success).toBe(false);
  });
});
