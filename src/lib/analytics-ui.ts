import type { AnalyticsReport, ReportKind, ReportRow } from "@/types/analytics";
export const reportNames: Record<ReportKind, string> = {
  income: "Ingresos por sucursal",
  expenses: "Gastos por sucursal",
  profit: "Ganancias globales",
  "routes-demand": "Demanda de rutas",
  "workshop-categories": "Gastos por categoría de taller",
  "route-map": "Mapa de rutas",
  "fleet-operations": "Operación de buses y choferes",
  "branch-operations": "Operaciones de sucursal",
};
export const reportColumns: Record<string, string> = {
  documentRef: "Comprobante",
  description: "Descripción",
  occurredAt: "Fecha",
  paymentDate: "Fecha de pago",
  serviceDate: "Fecha del servicio",
  completedAt: "Finalización",
  channel: "Canal",
  kind: "Tipo",
  branchId: "Sucursal",
  sourceBranchId: "Sucursal de venta",
  branchName: "Sucursal",
  invoiceId: "Factura",
  tripId: "Viaje",
  rentalId: "Alquiler",
  quoteId: "Cotización",
  routeId: "Ruta",
  originBranchId: "Sucursal de origen",
  busId: "Bus",
  driverId: "Chofer",
  sellerUserId: "Vendedor",
  sellerName: "Vendedor",
  ticketCount: "Cantidad de boletos",
  customerName: "Cliente",
  brand: "Marca",
  model: "Modelo",
  capacity: "Capacidad",
  state: "Estado",
  assignedDriverName: "Chofer asignado",
  plateNumber: "Placa",
  name: "Nombre",
  lastName: "Apellido",
  status: "Estado",
  licenseNumber: "Licencia",
  licenseType: "Tipo de licencia",
  licenseExpirationDate: "Vencimiento de licencia",
  currentKm: "Kilómetros actuales",
  startKm: "Kilómetros iniciales",
  endKm: "Kilómetros finales",
  completedTrips: "Viajes realizados",
  soldNotCancelledCount: "Boletos vigentes",
  origin: "Origen",
  destination: "Destino",
  departureAt: "Salida",
  returnDepartureAt: "Salida de retorno",
  outboundBusId: "Bus de ida",
  returnBusId: "Bus de retorno",
  outboundPlateNumber: "Placa de ida",
  returnPlateNumber: "Placa de retorno",
  distanceKm: "Kilómetros recorridos",
  ratePerKmApplied: "Tarifa histórica aplicada (Q/km)",
  passengerCount: "Pasajeros",
  waitHours: "Horas de espera",
  amount: "Importe (Q)",
  totalAmount: "Total (Q)",
  paidAmount: "Precio cobrado (Q)",
  income: "Ingresos (Q)",
  refunds: "Reembolsos reconocidos (Q)",
  costs: "Costos (Q)",
  net: "Neto (Q)",
  fuelCost: "Combustible (Q)",
  depreciationCost: "Depreciación (Q)",
  driverSalaryCost: "Chofer (Q)",
  totalCost: "Costo total (Q)",
  categoryName: "Categoría",
  lineType: "Tipo de detalle",
};
export function reportKeys(rows: ReportRow[]) {
  return [
    ...new Set(
      rows.flatMap((row) =>
        Object.keys(row).filter((key) => row[key] !== undefined && row[key] !== null),
      ),
    ),
  ];
}
export function decimalDisplay(value: string) {
  const [integer, fraction] = value.split(".");
  return `${(integer ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction ?? "00"}`;
}
export function cellDisplay(value: ReportRow[string]) {
  return value == null ? "—" : typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
}
export async function reportPdf(report: AnalyticsReport) {
  const { jsPDF } = await import("jspdf"),
    doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = 16;
  const add = (text: string, size = 10) => {
    doc.setFontSize(size);
    const safe = text.replace(/[\u0000-\u001f\u007f]/g, " ");
    const lines = doc.splitTextToSize(safe, 265) as string[];
    for (const line of lines) {
      if (y > 190) {
        doc.addPage();
        y = 16;
      }
      doc.text(line, 14, y);
      y += size === 16 ? 8 : 5;
    }
  };
  add("Transportes Guatemala", 16);
  add(reportNames[report.kind], 16);
  add(
    Object.entries(report.filters)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ") || "Todo el historial autorizado",
  );
  y += 4;
  for (const section of report.sections) {
    add(section.title, 13);
    const keys = reportKeys(section.rows);
    add(keys.map((k) => reportColumns[k] ?? k).join(" | "));
    for (const row of section.rows) add(keys.map((k) => cellDisplay(row[k])).join(" | "));
    if (!section.rows.length) add("Sin registros");
    if (section.subtotal !== undefined) add(`Subtotal Q${decimalDisplay(section.subtotal)}`, 12);
    y += 5;
  }
  if (report.grandTotal !== undefined)
    add(`Total general Q${decimalDisplay(report.grandTotal)}`, 13);
  if (report.mapRoutes?.length) {
    if (y > 90) {
      doc.addPage();
      y = 16;
    }
    add("Esquema geográfico de referencia (sin trazado vial)", 12);
    const points = report.mapRoutes.flatMap((r) => [r.origin, r.destination]),
      xs = points.map((p) => p.lng),
      ys = points.map((p) => p.lat),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys),
      height = 75;
    const position = (p: { lat: number; lng: number }) => ({
      x: 20 + ((p.lng - minX) / Math.max(maxX - minX, 0.0001)) * 245,
      y: y + height - ((p.lat - minY) / Math.max(maxY - minY, 0.0001)) * height,
    });
    doc.setDrawColor(23, 106, 82);
    doc.setLineWidth(0.6);
    for (const route of report.mapRoutes) {
      const from = position(route.origin),
        to = position(route.destination);
      doc.line(from.x, from.y, to.x, to.y);
      doc.circle(from.x, from.y, 1.3);
      doc.circle(to.x, to.y, 1.3);
      doc.setFontSize(8);
      doc.text(`Ruta ${route.routeId}`, (from.x + to.x) / 2, (from.y + to.y) / 2 - 2);
    }
    y += height + 6;
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text(
      `Página ${page} de ${doc.getNumberOfPages()} · Datos autorizados del reporte`,
      14,
      203,
    );
  }
  doc.save(`transportes-${report.kind}.pdf`);
}
