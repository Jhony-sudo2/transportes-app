// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { analyticsOperation } from "@/lib/api/analytics-operations";
import { cellDisplay, filterDisplay } from "@/lib/analytics-ui";
import type { AnalyticsReport } from "@/types/analytics";
const mocks = vi.hoisted(() => ({ session: vi.fn(), cookie: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
const quiche = { branchId: 2, name: "Quiché", latitude: 15.03, longitude: -91.15, active: true };
const xela = { branchId: 3, name: "Xela", latitude: 14.84, longitude: -91.52, active: true };
const peten = { branchId: 4, name: "Petén", latitude: 16.91, longitude: -89.89, active: true };
const routes = [
  // Quiché → Xela (Quiché es ORIGEN)
  { routeId: 1, originBranchId: 2, destinationBranchId: 3, distanceKm: 90, ticketPrice: 50 },
  // Xela → Petén (no involucra a Quiché)
  { routeId: 2, originBranchId: 3, destinationBranchId: 4, distanceKm: 400, ticketPrice: 150 },
  // Petén → Quiché (Quiché es DESTINO)
  { routeId: 3, originBranchId: 4, destinationBranchId: 2, distanceKm: 380, ticketPrice: 140 },
];
const bus = (id: number, plateNumber: string, busTypeId: number) => ({
  id,
  plateNumber,
  brand: "Volvo",
  model: "Touring",
  busTypeId,
  state: "AVAILABLE",
});
let overrides: Record<string, unknown>;
function asRole(name: string, branchIds: number[] = []) {
  mocks.session.mockResolvedValue({
    id: 7,
    isActive: true,
    resetPassword: false,
    branchIds,
    role: { id: name === "ADMIN" ? 1 : 3, name },
  });
}
const request = (kind: string, query = "") =>
  new NextRequest(`http://localhost:3000/api/analytics/${kind}${query ? `?${query}` : ""}`);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  asRole("ADMIN");
  mocks.cookie.mockImplementation((name: string) => ({
    value: name === "access_token" ? "token" : "2",
  }));
  overrides = {};
  mocks.fetch.mockImplementation(async (url: string, options: { method?: string }) => {
    const parsed = new URL(url),
      path = parsed.pathname.replace(/^\/api\/v1\//, "");
    const key = `${options.method ?? "GET"} ${path}`;
    if (key in overrides) {
      const value = overrides[key];
      return value instanceof Response ? value : Response.json(value);
    }
    const defaults: Record<string, unknown> = {
      branches: [quiche, xela, peten],
      "branches/catalog": [
        { branchId: 2, name: "Quiché" },
        { branchId: 3, name: "Xela" },
        { branchId: 4, name: "Petén" },
      ],
      "branches/2": quiche,
      "users/7/branches": [2],
      routes,
      users: {
        content: [{ id: 21, name: "Carla", lastName: "Cajera", email: "carla@example.com" }],
        page: 0,
        size: 200,
        totalElements: 1,
        totalPages: 1,
      },
      "branches/2/buses": [bus(5, "P-123ABC", 1)],
      "branches/3/buses": [bus(6, "P-456DEF", 2), bus(7, "P-789GHI", 1)],
      "branches/4/buses": [],
      "branches/2/drivers": [{ id: 8, name: "Juan", lastName: "Pérez" }],
      "branches/3/drivers": [],
      "branches/4/drivers": [],
      "bus-types": [
        { busTypeId: 1, name: "Pullman" },
        { busTypeId: 2, name: "Microbús" },
      ],
    };
    if ((options.method ?? "GET") === "GET" && path in defaults)
      return Response.json(defaults[path]);
    return Response.json({ detail: `No previsto: ${key}` }, { status: 500 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Reportes globales: nombres en lugar de IDs", () => {
  it("ingresos: traduce sucursal de venta y vendedor sin alterar las filas", async () => {
    const entry = {
      branchId: 2,
      documentRef: "F-1",
      date: "2026-11-04",
      kind: "SALE",
      amount: "75.00",
      channel: "WEB",
      sellerUserId: 21,
      sourceBranchId: 3,
    };
    overrides["GET reports/income"] = {
      branches: [{ branchId: 2, branchName: "Quiché", entries: [entry], subtotal: "75.00" }],
      grandTotal: "75.00",
    };
    const response = await analyticsOperation(request("income"), "income");
    expect(response.status).toBe(200);
    const report: AnalyticsReport = await response.json();
    // Las filas siguen siendo las de Analytics (IDs intactos).
    expect(report.sections[0]?.rows[0]).toMatchObject({ sellerUserId: 21, sourceBranchId: 3 });
    expect(report.names?.users["21"]).toBe("Carla Cajera");
    expect(report.names?.branches["3"]).toBe("Xela");
    const row = report.sections[0]?.rows[0] ?? {};
    expect(cellDisplay(row["sellerUserId"], "sellerUserId", report.names)).toBe("Carla Cajera");
    expect(cellDisplay(row["sourceBranchId"], "sourceBranchId", report.names)).toBe("Xela");
    expect(cellDisplay(row["kind"], "kind", report.names)).toBe("Venta");
    // El reporte se pide primero; los nombres se consultan después.
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/reports\/income\?$/);
  });
  it("demanda de rutas: muestra 'Origen → Destino' en lugar del número de ruta", async () => {
    overrides["GET reports/routes-demand"] = {
      report: "routes-demand",
      rows: [{ routeId: 3, originBranchId: 4, soldNotCancelledCount: 4 }],
    };
    const report: AnalyticsReport = await (
      await analyticsOperation(request("routes-demand"), "routes-demand")
    ).json();
    const row = report.sections[0]?.rows[0] ?? {};
    expect(cellDisplay(row["routeId"], "routeId", report.names)).toBe("Petén → Quiché");
    expect(cellDisplay(row["originBranchId"], "originBranchId", report.names)).toBe("Petén");
  });
  it("taller por categoría: muestra la placa del bus en lugar del ID", async () => {
    overrides["GET reports/workshop-categories"] = {
      report: "workshop-categories",
      filters: { branchId: null },
      rows: [
        {
          categoryId: 1,
          categoryName: "Repuestos",
          subtotal: "25.00",
          lines: [{ branchId: 3, busId: 6, description: "Filtro", amount: "25.00" }],
        },
      ],
      grandTotal: "25.00",
    };
    const report: AnalyticsReport = await (
      await analyticsOperation(request("workshop-categories", "busId=6"), "workshop-categories")
    ).json();
    expect(cellDisplay(6, "busId", report.names)).toBe("P-456DEF · Volvo Touring");
    expect(filterDisplay(report)).toBe("Bus: P-456DEF · Volvo Touring");
  });
  it("si un servicio de nombres falla, el reporte se entrega igual con 'Tipo #id'", async () => {
    overrides["GET users"] = Response.json({ detail: "caído" }, { status: 503 });
    overrides["GET branches"] = Response.json({ detail: "caído" }, { status: 503 });
    overrides["GET branches/catalog"] = Response.json({ detail: "caído" }, { status: 503 });
    overrides["GET reports/income"] = {
      branches: [
        {
          branchId: 2,
          branchName: "Quiché",
          entries: [{ amount: "10.00", sellerUserId: 21, sourceBranchId: 3 }],
          subtotal: "10.00",
        },
      ],
      grandTotal: "10.00",
    };
    const response = await analyticsOperation(request("income"), "income");
    expect(response.status).toBe(200);
    const report: AnalyticsReport = await response.json();
    expect(cellDisplay(21, "sellerUserId", report.names)).toBe("Usuario #21");
    expect(cellDisplay(3, "sourceBranchId", report.names)).toBe("Sucursal #3");
  });
  it("sin nombres y sin columna, cellDisplay conserva el comportamiento anterior", () => {
    expect(cellDisplay(5)).toBe("5");
    expect(cellDisplay(null)).toBe("—");
    expect(cellDisplay(true)).toBe("Sí");
    expect(cellDisplay("F-1", "documentRef")).toBe("F-1");
  });
  it("operaciones de sucursal: subtotal con nombre, ruta y chofer por nombre", async () => {
    asRole("SUCURSAL_ADMIN", [2]);
    // Como en Fleet real: SUCURSAL_ADMIN no puede listar todas las sucursales; se usa el catálogo.
    overrides["GET branches"] = Response.json(
      { code: "AUTH_FORBIDDEN", message: "Access denied" },
      { status: 403 },
    );
    overrides["GET reports/branch-operations"] = {
      report: "DEPRECIATION",
      filters: { branchId: 2 },
      rows: [{ tripId: 1, routeId: 1, busId: 5, driverId: 8, depreciationCost: "12.50" }],
      subtotals: { "2": "12.50" },
      grandTotal: "12.50",
    };
    const response = await analyticsOperation(
      request("branch-operations", "branchId=2&kind=DEPRECIATION"),
      "branch-operations",
    );
    expect(response.status).toBe(200);
    const report: AnalyticsReport = await response.json();
    expect(report.sections[1]?.title).toBe("Subtotal de Quiché");
    expect(report.sections[1]?.subtotal).toBe("12.50");
    expect(cellDisplay(1, "routeId", report.names)).toBe("Quiché → Xela");
    expect(cellDisplay(5, "busId", report.names)).toBe("P-123ABC · Volvo Touring");
    expect(cellDisplay(8, "driverId", report.names)).toBe("Juan Pérez");
    // SUCURSAL_ADMIN no consulta el directorio de usuarios ni buses de otras sucursales.
    const paths = mocks.fetch.mock.calls.map(([url]) => new URL(url).pathname);
    expect(paths.some((p) => /\/api\/v1\/users$/.test(p))).toBe(false);
    expect(paths.some((p) => p.endsWith("branches/3/buses"))).toBe(false);
  });
});

describe("Mapa de rutas: la sucursal como ORIGEN y como DESTINO", () => {
  it("agrega las rutas que llegan a la sucursal, sin repetir ni incluir ajenas", async () => {
    overrides["GET reports/route-map"] = {
      report: "route-map",
      filters: { branchId: 2 },
      rows: [
        {
          routeId: 1,
          origin: { lat: 15.03, lng: -91.15 },
          destination: { lat: 14.84, lng: -91.52 },
        },
      ],
    };
    const response = await analyticsOperation(
      request("route-map", "originBranchId=2"),
      "route-map",
    );
    expect(response.status).toBe(200);
    const report: AnalyticsReport = await response.json();
    expect(report.mapRoutes?.map((r) => r.routeId)).toEqual([1]);
    // Solo Petén → Quiché llega a Quiché; Xela → Petén no la involucra.
    expect(report.incomingRoutes).toEqual([
      { routeId: 3, origin: { lat: 16.91, lng: -89.89 }, destination: { lat: 15.03, lng: -91.15 } },
    ]);
    expect(report.sections.map((s) => s.title)).toEqual([
      "Rutas que salen de Quiché (origen)",
      "Rutas que llegan a Quiché (destino)",
    ]);
    expect(report.sections[0]?.rows).toEqual([{ routeId: 1, direction: "Origen" }]);
    expect(report.sections[1]?.rows).toEqual([{ routeId: 3, direction: "Destino" }]);
    expect(cellDisplay(3, "routeId", report.names)).toBe("Petén → Quiché");
    expect(filterDisplay(report)).toBe("Sucursal: Quiché");
  });
  it("visto desde Xela, la ruta Quiché → Xela aparece como DESTINO", async () => {
    overrides["GET reports/route-map"] = {
      report: "route-map",
      filters: { branchId: 3 },
      rows: [
        {
          routeId: 2,
          origin: { lat: 14.84, lng: -91.52 },
          destination: { lat: 16.91, lng: -89.89 },
        },
      ],
    };
    const report: AnalyticsReport = await (
      await analyticsOperation(request("route-map", "originBranchId=3"), "route-map")
    ).json();
    expect(report.mapRoutes?.map((r) => r.routeId)).toEqual([2]);
    expect(report.incomingRoutes?.map((r) => r.routeId)).toEqual([1]);
  });
  it("omite rutas de llegada cuya sucursal de origen no tiene coordenadas", async () => {
    overrides["GET branches"] = [quiche, xela, { ...peten, latitude: null, longitude: null }];
    overrides["GET reports/route-map"] = {
      report: "route-map",
      filters: { branchId: 2 },
      rows: [],
    };
    const report: AnalyticsReport = await (
      await analyticsOperation(request("route-map", "originBranchId=2"), "route-map")
    ).json();
    expect(report.incomingRoutes).toEqual([]);
  });
  it("si Journey no responde, el mapa muestra al menos las rutas de origen", async () => {
    overrides["GET routes"] = Response.json({ detail: "caído" }, { status: 503 });
    overrides["GET reports/route-map"] = {
      report: "route-map",
      filters: { branchId: 2 },
      rows: [
        {
          routeId: 1,
          origin: { lat: 15.03, lng: -91.15 },
          destination: { lat: 14.84, lng: -91.52 },
        },
      ],
    };
    const response = await analyticsOperation(
      request("route-map", "originBranchId=2"),
      "route-map",
    );
    expect(response.status).toBe(200);
    const report: AnalyticsReport = await response.json();
    expect(report.mapRoutes?.length).toBe(1);
    expect(report.incomingRoutes).toEqual([]);
    expect(cellDisplay(1, "routeId", report.names)).toBe("Ruta #1");
  });
});

describe("Opciones con nombre para filtros de bus y ruta", () => {
  it("ADMIN recibe los buses de todas las sucursales con placa, tipo y sucursal", async () => {
    const response = await analyticsOperation(request("buses"), "buses");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: 6,
        label: "P-456DEF · Volvo Touring",
        busTypeName: "Microbús",
        branchId: 3,
        branchName: "Xela",
      },
      {
        id: 5,
        label: "P-123ABC · Volvo Touring",
        busTypeName: "Pullman",
        branchId: 2,
        branchName: "Quiché",
      },
      {
        id: 7,
        label: "P-789GHI · Volvo Touring",
        busTypeName: "Pullman",
        branchId: 3,
        branchName: "Xela",
      },
    ]);
  });
  it("ADMIN puede limitar los buses a una sucursal", async () => {
    const options = await (
      await analyticsOperation(request("buses", "branchId=2"), "buses")
    ).json();
    expect(options.map((o: { id: number }) => o.id)).toEqual([5]);
  });
  it("SUCURSAL_ADMIN solo recibe buses y rutas de su sucursal", async () => {
    asRole("SUCURSAL_ADMIN", [2]);
    const buses = await (await analyticsOperation(request("buses", "branchId=2"), "buses")).json();
    expect(buses.map((o: { id: number }) => o.id)).toEqual([5]);
    const calls = mocks.fetch.mock.calls.map(([url]) => new URL(url).pathname);
    expect(calls.some((p) => p.endsWith("branches/3/buses"))).toBe(false);
    const options = await (
      await analyticsOperation(request("routes", "branchId=2"), "routes")
    ).json();
    expect(options).toEqual([
      { id: 3, label: "Petén → Quiché" },
      { id: 1, label: "Quiché → Xela" },
    ]);
  });
  it("rechaza roles sin acceso a reportes", async () => {
    asRole("CUSTOMER");
    expect((await analyticsOperation(request("buses"), "buses")).status).toBe(403);
    expect((await analyticsOperation(request("routes"), "routes")).status).toBe(403);
  });
  it("rechaza una sucursal inválida en el filtro", async () => {
    expect((await analyticsOperation(request("buses", "branchId=abc"), "buses")).status).toBe(400);
  });
  it("si Fleet no entrega buses (caído o rol sin permiso), avisa que la lista no está disponible", async () => {
    for (const failure of [
      Response.json({ detail: "caído" }, { status: 503 }),
      Response.json({ code: "AUTH_FORBIDDEN", message: "Access denied" }, { status: 403 }),
    ]) {
      overrides["GET branches/2/buses"] = failure;
      const response = await analyticsOperation(request("buses", "branchId=2"), "buses");
      expect(response.status).toBe(503);
      expect((await response.json()).detail).toBe(
        "La lista de buses no está disponible para tu rol. El reporte incluirá todos los buses.",
      );
    }
  });
  it("si solo algunas sucursales fallan, entrega los buses de las que respondieron", async () => {
    overrides["GET branches/3/buses"] = Response.json({ detail: "caído" }, { status: 503 });
    const response = await analyticsOperation(request("buses"), "buses");
    expect(response.status).toBe(200);
    expect((await response.json()).map((o: { id: number }) => o.id)).toEqual([5]);
  });
  it("una sucursal sin buses no es un error: lista vacía", async () => {
    const response = await analyticsOperation(request("buses", "branchId=4"), "buses");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
  it("si Journey no responde, la lista de rutas avisa que no está disponible", async () => {
    overrides["GET routes"] = Response.json({ detail: "caído" }, { status: 503 });
    const response = await analyticsOperation(request("routes"), "routes");
    expect(response.status).toBe(503);
  });
});
