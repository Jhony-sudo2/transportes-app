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
export interface AnalyticsReport {
  kind: ReportKind;
  sections: ReportSection[];
  grandTotal?: string | undefined;
  mapRoutes?: ReportMapRoute[] | undefined;
  filters: Record<string, string>;
}
