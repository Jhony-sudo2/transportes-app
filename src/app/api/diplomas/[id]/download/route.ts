import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { activeConference } from "@/lib/api/active-conference";
import { unauthorizedResponse, internalErrorResponse } from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";
import { applicationErrorResponse } from "@/lib/api/responses";
import type { DiplomaPrintData } from "@/lib/validators/diploma";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDiplomaHtml(data: DiplomaPrintData): string {
  const isLeadership = data.type === "LEADERSHIP";
  const typeLabel = isLeadership ? "LIDERAZGO" : "PARTICIPACION";
  const bodyText = isLeadership
    ? `por haber liderado la actividad <strong>${escapeHtml(data.activityName ?? "")}</strong> en el congreso`
    : "por haber participado en el congreso";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Diploma de ${escapeHtml(typeLabel)} - ${escapeHtml(data.congressName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Google Sans', 'Segoe UI', system-ui, sans-serif;
    background: #f8f9fa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
    gap: 20px;
  }
  .actions {
    display: flex;
    gap: 12px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    border-radius: 8px;
    font-family: 'Google Sans', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    text-decoration: none;
  }
  .btn-primary { background: #0b57d0; color: #ffffff; }
  .btn-secondary { background: #f8f9fa; color: #1f1f1f; border: 1px solid #d2d2d2; }
  .diploma {
    background: #ffffff;
    border: 2px solid #0b57d0;
    border-radius: 8px;
    max-width: 760px;
    width: 100%;
    padding: 56px 64px;
    text-align: center;
    position: relative;
  }
  .top-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 6px;
    background: #0b57d0;
    border-radius: 6px 6px 0 0;
  }
  .accent { width: 80px; height: 4px; background: #0b57d0; margin: 0 auto 32px; border-radius: 2px; }
  .label {
    font-family: 'Roboto', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.15em;
    color: #70757a;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .title {
    font-size: 28px;
    font-weight: 600;
    color: #1f1f1f;
    margin-bottom: 32px;
    letter-spacing: 0.04em;
  }
  .body-text {
    font-family: 'Roboto', system-ui, sans-serif;
    font-size: 15px;
    color: #3c4043;
    line-height: 1.6;
    margin-bottom: 8px;
  }
  .recipient {
    font-size: 34px;
    font-weight: 600;
    color: #0b57d0;
    margin: 16px 0 24px;
    border-bottom: 1px solid #d2d2d2;
    padding-bottom: 24px;
    line-height: 1.2;
  }
  .congress-name {
    font-size: 18px;
    font-weight: 500;
    color: #1f1f1f;
    margin: 16px 0 32px;
    line-height: 1.4;
  }
  .divider { width: 40px; height: 2px; background: #d2d2d2; margin: 0 auto 24px; }
  .footer {
    font-family: 'Roboto', system-ui, sans-serif;
    font-size: 12px;
    color: #70757a;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #f1f3f4;
  }
  @media print {
    body { background: #fff; padding: 0; gap: 0; }
    .diploma {
      border: 2px solid #0b57d0;
      max-width: 100%;
      box-shadow: none;
    }
    .actions { display: none; }
    @page { margin: 20mm; size: A4 landscape; }
  }
</style>
</head>
<body>
<div class="actions no-print">
  <button class="btn btn-primary" onclick="window.print()">Imprimir / Guardar PDF</button>
  <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
</div>
<div class="diploma">
  <div class="top-bar"></div>
  <div class="accent"></div>
  <p class="label">Code 'n Bugs &mdash; Diploma de</p>
  <h1 class="title">${escapeHtml(typeLabel)}</h1>
  <p class="body-text">Se otorga el presente diploma a</p>
  <p class="recipient">${escapeHtml(data.userFullName)}</p>
  <p class="body-text">${bodyText}</p>
  <p class="congress-name">${escapeHtml(data.congressName)}</p>
  <div class="divider"></div>
  <p class="footer">Emitido el ${escapeHtml(formatDate(data.issuedAt))} &nbsp;&bull;&nbsp; Code 'n Bugs Congress Platform</p>
</div>
</body>
</html>`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  const token = await getToken();
  if (token === null) return unauthorizedResponse();
  const { id } = await params;
  try {
    const printData = await activeConference.getDiplomaPrintData(id, token);
    const html = buildDiplomaHtml(printData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return internalErrorResponse();
  }
}
