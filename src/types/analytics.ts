export type ReportKind =
  | "income"
  | "expenses"
  | "profit"
  | "routes-demand"
  | "workshop-categories"
  | "route-map"
  | "fleet-operations"
  | "branch-operations";
export interface ReportRow {
  [column: string]: string | number | boolean | null | undefined;
}
export interface ReportSection {
  title: string;
  rows: ReportRow[];
  subtotal?: string | undefined;
}
export interface ReportMapRoute {
  routeId: number;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}
/** Nombres por ID para mostrar en lugar de los identificadores que entrega Analytics. */
export interface ReportNames {
  branches: Record<string, string>;
  routes: Record<string, string>;
  users: Record<string, string>;
  buses: Record<string, string>;
  drivers: Record<string, string>;
}
export interface ReportBusOption {
  id: number;
  label: string;
  busTypeName: string;
  branchId: number;
  branchName: string;
}
export interface ReportRouteOption {
  id: number;
  label: string;
}
export interface AnalyticsReport {
  kind: ReportKind;
  sections: ReportSection[];
  grandTotal?: string | undefined;
  /** Rutas donde la sucursal consultada es el ORIGEN. */
  mapRoutes?: ReportMapRoute[] | undefined;
  /** Rutas donde la sucursal consultada es el DESTINO. */
  incomingRoutes?: ReportMapRoute[] | undefined;
  names?: ReportNames | undefined;
  filters: Record<string, string>;
}
