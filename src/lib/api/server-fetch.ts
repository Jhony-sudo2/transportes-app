import "server-only";

import { cookies } from "next/headers";

/**
 * Wraps `fetch` for use in Server Components that call internal Next.js BFF routes.
 * Forwards the browser's Cookie header so that route handlers can read
 * `access_token` / `refresh_token` via `next/headers` cookies().
 */
export async function serverFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: cookieHeader,
    },
  });
}
