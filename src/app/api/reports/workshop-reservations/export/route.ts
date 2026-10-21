import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
import { unauthorizedResponse, forbiddenResponse, internalErrorResponse } from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";
import { applicationErrorResponse } from "@/lib/api/responses";
import type { WorkshopReservationReportData } from "@/lib/validators/reports";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: WorkshopReservationReportData): string {
  const rows = data.items
    .map((w) => {
      const rosterList =
        w.roster.length === 0
          ? "<em>Sin reservas</em>"
          : w.roster.map((r) => `${esc(r.fullName)} (${esc(r.personalId)})`).join("<br/>");

      const pct = w.workshopCapacity > 0
        ? Math.round((w.reservationCount / w.workshopCapacity) * 100)
        : 0;

      return `<tr>
        <td>${esc(w.activityName)}</td>
        <td style="text-align:center">${w.workshopCapacity}</td>
        <td style="text-align:center;font-weight:500">${w.reservationCount}</td>
        <td style="text-align:center">${w.availableSeats}</td>
        <td style="text-align:center">${pct}%</td>
        <td style="font-size:12px">${rosterList}</td>
      </tr>`;
    })
    .join("");

  return buildReportPage(
    "Reservas de Talleres",
    "Reporte de reservas por taller",
    data.totalItems,
    ["Taller", "Capacidad", "Reservas", "Disponibles", "Ocupacion", "Lista de inscritos"],
    rows,
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  if (!session.roles.includes("CONGRESS_ADMIN")) return forbiddenResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();

  try {
    const params = new URL(request.url).searchParams;
    const data = await activeConference.getWorkshopReservationReport(token, params);
    const html = buildHtml(data);
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}

function buildReportPage(
  title: string,
  subtitle: string,
  totalItems: number,
  headers: string[],
  bodyRows: string,
): string {
  const now = new Date().toLocaleDateString("es-GT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const headerCells = headers.map((h) => `<th>${h}</th>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Google Sans', 'Segoe UI', system-ui, sans-serif; background: #f8f9fa; padding: 32px; color: #1f1f1f; }
  .actions { display: flex; gap: 12px; margin-bottom: 24px; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; border-radius: 8px; font-family: 'Google Sans', system-ui, sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
  .btn-primary { background: #0b57d0; color: #ffffff; }
  .btn-secondary { background: #f8f9fa; color: #1f1f1f; border: 1px solid #d2d2d2; }
  .report-card { background: #ffffff; border: 1px solid #d2d2d2; border-radius: 8px; padding: 32px; }
  .report-header { margin-bottom: 24px; border-bottom: 2px solid #0b57d0; padding-bottom: 16px; }
  .brand { font-family: 'Roboto', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #70757a; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
  h1 { font-size: 22px; font-weight: 600; color: #1f1f1f; margin-bottom: 4px; }
  .subtitle { font-family: 'Roboto', system-ui, sans-serif; font-size: 13px; color: #70757a; }
  .meta { margin-top: 8px; font-family: 'Roboto', system-ui, sans-serif; font-size: 12px; color: #70757a; }
  table { width: 100%; border-collapse: collapse; font-family: 'Roboto', system-ui, sans-serif; font-size: 13px; }
  thead tr { background: #f8f9fa; border-bottom: 2px solid #d2d2d2; }
  th { padding: 10px 12px; text-align: left; font-weight: 500; color: #3c4043; font-size: 12px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f3f4; color: #3c4043; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 20px; font-family: 'Roboto', system-ui, sans-serif; font-size: 11px; color: #70757a; display: flex; justify-content: space-between; }
  @media print {
    body { background: #fff; padding: 16px; }
    .actions { display: none; }
    .report-card { border: none; padding: 0; }
    @page { margin: 15mm; size: A4 landscape; }
  }
</style>
</head>
<body>
<div class="actions">
  <button class="btn btn-primary" onclick="window.print()">Imprimir / Guardar PDF</button>
  <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
</div>
<div class="report-card">
  <div class="report-header">
    <p class="brand">Code 'n Bugs &mdash; Reporte</p>
    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p class="meta">Total de registros: ${totalItems} &nbsp;&bull;&nbsp; Generado el ${now}</p>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">
    <span>Code 'n Bugs Congress Platform</span>
    <span>${now}</span>
  </div>
</div>
</body>
</html>`;
}
