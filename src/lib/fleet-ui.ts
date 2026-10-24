export async function readFleetResponse(response: Response): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      "No se pudo confirmar la respuesta. Verifica el registro antes de volver a guardarlo.",
    );
  }
  if (!response.ok)
    throw new Error(
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : "No se pudo completar la solicitud.",
    );
  return body;
}
