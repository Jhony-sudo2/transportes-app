import type { z } from "zod";
import { readFleetResponse } from "@/lib/fleet-ui";

export async function identityPost<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "No se pudo confirmar la solicitud. Comprueba tu conexión y revisa tu correo o el estado de tu cuenta antes de repetirla.",
    );
  }
  const parsed = schema.safeParse(await readFleetResponse(response));
  if (!parsed.success)
    throw new Error(
      "El servidor no confirmó el resultado esperado. Revisa tu cuenta antes de repetir la solicitud.",
    );
  return parsed.data;
}
