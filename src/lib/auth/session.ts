import "server-only";
import { TransportUserSchema } from "@/lib/validators/auth";
import { transportRequest } from "@/lib/api/iam";
import { ApplicationError } from "@/types/error";

import { cookies } from "next/headers";
import type { Session } from "@/types/auth";
import { SessionSchema } from "@/lib/validators/auth";

/**
 * Reads the access_token cookie and decodes the JWT payload.
 * Does not verify the JWT signature (verification is done by microservices).
 * Returns null if the cookie is absent or the payload cannot be decoded.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (token === undefined || token === "") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadBase64 = parts[1];
    if (payloadBase64 === undefined) {
      return null;
    }
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const rawPayload: unknown = JSON.parse(payloadJson);
    const result = SessionSchema.safeParse(rawPayload);

    if (!result.success) {
      return null;
    }

    return { ...result.data, token };
  } catch {
    return null;
  }
}

// Sesión del nuevo dominio: Identity valida el token y devuelve el usuario vigente.
export async function getTransportSession() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return null;
  try {
    const user = TransportUserSchema.parse(await transportRequest("users/profile", { token }));
    return user.isActive ? user : null;
  } catch (error) {
    if (error instanceof ApplicationError && (error.status === 401 || error.status === 403))
      return null;
    throw error;
  }
}
