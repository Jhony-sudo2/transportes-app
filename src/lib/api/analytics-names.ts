import "server-only";
import { z } from "zod";
import { transportService } from "./transport-service";
import { ApplicationError } from "@/types/error";
import type {
  AnalyticsReport,
  ReportBusOption,
  ReportMapRoute,
  ReportNames,
  ReportRouteOption,
} from "@/types/analytics";

/**
 * Analytics entrega IDs (sucursal, ruta, vendedor, bus, chofer). Aquí se traducen a nombres con
 * endpoints que ya existen, sin tocar las filas del reporte. Cada consulta es opcional: si un
 * servicio falla, el reporte se sigue mostrando y solo ese nombre queda sin resolver.
 */
type Access = {
  token: string;
  branchId?: number | undefined;
  user: { role: { name: string } };
};
const positive = z.number().int().positive().safe();
const BranchNameSchema = z.preprocess(
  (raw) =>
    raw && typeof raw === "object" && !("id" in raw) && "branchId" in raw
      ? { ...raw, id: (raw as { branchId: unknown }).branchId }
      : raw,
  z.object({
    id: positive,
    name: z.string().trim().min(1),
    latitude: z.number().finite().min(-90).max(90).nullish(),
    longitude: z.number().finite().min(-180).max(180).nullish(),
    active: z.boolean().optional(),
  }),
);
const RouteNameSchema = z.object({
  routeId: positive,
  originBranchId: positive,
  destinationBranchId: positive,
});
const UserPageSchema = z.object({
  content: z.array(
    z.object({
      id: positive,
      name: z.string().nullish(),
      lastName: z.string().nullish(),
      email: z.string().nullish(),
    }),
  ),
  totalPages: z.number().int().nonnegative(),
});
const BusNameSchema = z.object({
  id: positive,
  plateNumber: z.string().trim().min(1),
  brand: z.string().nullish(),
  model: z.union([z.string(), z.number()]).nullish(),
  busTypeId: positive.nullish(),
});
const BusTypeNameSchema = z.preprocess(
  (raw) =>
    raw && typeof raw === "object" && !("id" in raw) && "busTypeId" in raw
      ? { ...raw, id: (raw as { busTypeId: unknown }).busTypeId }
      : raw,
  z.object({ id: positive, name: z.string().trim().min(1) }),
);
const DriverNameSchema = z.object({
  id: positive,
  name: z.string().nullish(),
  lastName: z.string().nullish(),
});
export type NamedBranch = z.infer<typeof BranchNameSchema>;

async function optional<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  load: () => Promise<unknown>,
) {
  try {
    const parsed = schema.safeParse(await load());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
const fullName = (name?: string | null, lastName?: string | null) =>
  [name, lastName]
    .filter((part) => !!part && part.trim())
    .join(" ")
    .trim();

/**
 * Sucursales con coordenadas (GET /branches, solo ADMIN). Para otros roles Fleet lo niega y se usa
 * el catálogo público de sedes activas, que trae id y nombre.
 */
export async function loadBranches(a: Access) {
  return (
    (await optional(z.array(BranchNameSchema), () => transportService("branches", a))) ??
    optional(z.array(BranchNameSchema), () => transportService("branches/catalog", a))
  );
}
export const loadRoutes = (a: Access) =>
  optional(z.array(RouteNameSchema), () => transportService("routes", a));
async function loadUsers(a: Access) {
  // Solo ADMIN puede consultar el directorio de usuarios.
  if (a.user.role.name !== "ADMIN") return null;
  const names: Record<string, string> = {};
  for (let page = 0; page < 50; page++) {
    const result = await optional(UserPageSchema, () =>
      transportService(`users?page=${page}&size=200&sortBy=id&ascending=true`, a),
    );
    if (!result) return Object.keys(names).length ? names : null;
    for (const user of result.content)
      names[String(user.id)] = fullName(user.name, user.lastName) || user.email || "";
    if (page + 1 >= result.totalPages) break;
  }
  return names;
}
async function loadBranchResources<T>(
  a: Access,
  branchIds: number[],
  resource: "buses" | "drivers",
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
) {
  const lists = await Promise.all(
    branchIds.map(async (branchId) => {
      const items = await optional(z.array(schema), () =>
        transportService(`branches/${branchId}/${resource}`, a),
      );
      return { branchId, ok: items !== null, items: items ?? [] };
    }),
  );
  return lists;
}
const busLabel = (bus: z.infer<typeof BusNameSchema>) =>
  [bus.plateNumber, [bus.brand, bus.model].filter((p) => p != null && p !== "").join(" ")]
    .filter(Boolean)
    .join(" · ");
export function routeLabel(
  route: { originBranchId: number; destinationBranchId: number },
  branches: Record<string, string>,
) {
  const name = (id: number) => branches[String(id)] ?? `Sucursal #${id}`;
  return `${name(route.originBranchId)} → ${name(route.destinationBranchId)}`;
}

const BUS_KEYS = ["busId", "outboundBusId", "returnBusId"];
function collect(report: AnalyticsReport, keys: string[]) {
  const ids = new Set<number>();
  for (const section of report.sections)
    for (const row of section.rows)
      for (const key of keys) {
        const value = row[key];
        if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ids.add(value);
      }
  return ids;
}
/** Branches a las que el actor puede consultar buses/choferes. */
function scopedBranchIds(a: Access, branches: NamedBranch[] | null) {
  if (a.branchId) return [a.branchId];
  return (branches ?? []).filter((b) => b.active !== false).map((b) => b.id);
}

export async function resolveReportNames(report: AnalyticsReport, a: Access): Promise<ReportNames> {
  const needsRoutes = collect(report, ["routeId"]).size > 0 || !!report.mapRoutes;
  const needsUsers = collect(report, ["sellerUserId"]).size > 0;
  const needsBuses = collect(report, BUS_KEYS).size > 0;
  const needsDrivers = collect(report, ["driverId"]).size > 0;
  const [branchList, routeList, users] = await Promise.all([
    loadBranches(a),
    needsRoutes ? loadRoutes(a) : Promise.resolve(null),
    needsUsers ? loadUsers(a) : Promise.resolve(null),
  ]);
  const names: ReportNames = {
    branches: {},
    routes: {},
    users: users ?? {},
    buses: {},
    drivers: {},
  };
  for (const branch of branchList ?? []) names.branches[String(branch.id)] = branch.name;
  for (const route of routeList ?? [])
    names.routes[String(route.routeId)] = routeLabel(route, names.branches);
  const scope = scopedBranchIds(a, branchList);
  const [buses, drivers] = await Promise.all([
    needsBuses ? loadBranchResources(a, scope, "buses", BusNameSchema) : Promise.resolve([]),
    needsDrivers ? loadBranchResources(a, scope, "drivers", DriverNameSchema) : Promise.resolve([]),
  ]);
  for (const { items } of buses)
    for (const bus of items) names.buses[String(bus.id)] = busLabel(bus);
  for (const { items } of drivers)
    for (const driver of items) {
      const label = fullName(driver.name, driver.lastName);
      if (label) names.drivers[String(driver.id)] = label;
    }
  return names;
}

/** Rutas que llegan a la sucursal (la sucursal es DESTINO), con coordenadas de Fleet. */
export async function incomingRoutes(
  a: Access,
  branchId: number,
  outgoing: ReportMapRoute[],
): Promise<ReportMapRoute[]> {
  const [routes, branches] = await Promise.all([loadRoutes(a), loadBranches(a)]);
  if (!routes || !branches) return [];
  const byId = new Map(branches.map((b) => [b.id, b]));
  const known = new Set(outgoing.map((r) => r.routeId));
  const result: ReportMapRoute[] = [];
  for (const route of routes) {
    if (route.destinationBranchId !== branchId || route.originBranchId === branchId) continue;
    if (known.has(route.routeId)) continue;
    const origin = byId.get(route.originBranchId),
      destination = byId.get(route.destinationBranchId);
    if (origin?.latitude == null || origin.longitude == null) continue;
    if (destination?.latitude == null || destination.longitude == null) continue;
    result.push({
      routeId: route.routeId,
      origin: { lat: origin.latitude, lng: origin.longitude },
      destination: { lat: destination.latitude, lng: destination.longitude },
    });
  }
  return result.sort((x, y) => x.routeId - y.routeId);
}

/** Opciones de bus con nombre (placa · marca modelo) agrupadas por tipo, para los filtros. */
export async function busOptions(a: Access, branchId?: number): Promise<ReportBusOption[]> {
  const branches = await loadBranches(a);
  const scope = branchId ? [branchId] : scopedBranchIds(a, branches);
  const [lists, types] = await Promise.all([
    loadBranchResources(a, scope, "buses", BusNameSchema),
    optional(z.array(BusTypeNameSchema), () => transportService("bus-types", a)),
  ]);
  // Fleet no permite a todos los roles listar buses: si ninguna sucursal respondió, se informa
  // que la lista no está disponible (no se muestra "no hay buses", que sería engañoso).
  if (lists.length > 0 && lists.every((list) => !list.ok))
    throw new ApplicationError(
      "system.internal_error",
      503,
      "La lista de buses no está disponible para tu rol. El reporte incluirá todos los buses.",
    );
  const typeNames = new Map((types ?? []).map((t) => [t.id, t.name]));
  const branchNames = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const seen = new Set<number>();
  const options: ReportBusOption[] = [];
  for (const { branchId: owner, items } of lists)
    for (const bus of items) {
      if (seen.has(bus.id)) continue;
      seen.add(bus.id);
      options.push({
        id: bus.id,
        label: busLabel(bus),
        busTypeName: (bus.busTypeId != null && typeNames.get(bus.busTypeId)) || "Sin tipo",
        branchId: owner,
        branchName: branchNames.get(owner) ?? `Sucursal #${owner}`,
      });
    }
  return options.sort(
    (x, y) =>
      x.busTypeName.localeCompare(y.busTypeName, "es") || x.label.localeCompare(y.label, "es"),
  );
}

/** Rutas con nombre "Origen → Destino" para el filtro opcional de ruta. */
export async function routeOptions(a: Access, branchId?: number): Promise<ReportRouteOption[]> {
  const [routes, branches] = await Promise.all([loadRoutes(a), loadBranches(a)]);
  if (!routes)
    throw new ApplicationError(
      "system.internal_error",
      503,
      "La lista de rutas no está disponible. El reporte incluirá todas las rutas.",
    );
  const names: Record<string, string> = {};
  for (const branch of branches ?? []) names[String(branch.id)] = branch.name;
  return routes
    .filter((r) => !branchId || r.originBranchId === branchId || r.destinationBranchId === branchId)
    .map((r) => ({ id: r.routeId, label: routeLabel(r, names) }))
    .sort((x, y) => x.label.localeCompare(y.label, "es"));
}
