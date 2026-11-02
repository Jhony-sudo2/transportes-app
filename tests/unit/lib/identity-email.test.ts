// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as email } from "@/app/api/auth/email/[action]/route";
import { POST as changeEmail } from "@/app/api/account/email-change/route";
import { middleware } from "@/middleware";

const mocks = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
const user = {
  id: 17,
  email: "actual@example.com",
  isActive: true,
  resetPassword: false,
  role: { id: 2, name: "CUSTOMER" },
};
function request(body: unknown, path = "auth/email/confirm", origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/" + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function action(value = "confirm") {
  return { params: Promise.resolve({ action: value }) };
}

describe("HU-ID-01/04, verificación de email separada de titularidad", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(user);
    mocks.get.mockReturnValue({ value: "private-session" });
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    { operation: "confirm", path: "auth/email-confirm" },
    { operation: "confirm-change", path: "users/profile/email-confirm" },
  ])(
    "confirma $operation con token opaco, sin sesión ni datos adicionales",
    async ({ operation, path }) => {
      mocks.session.mockResolvedValue(null);
      mocks.fetch.mockResolvedValueOnce(Response.json({ emailVerified: true }));
      expect(
        await (await email(request({ token: "opaque-token" }), action(operation))).json(),
      ).toEqual({ emailVerified: true });
      const [url, options] = mocks.fetch.mock.calls[0] ?? [];
      expect(url).toMatch(new RegExp("/api/v1/" + path + "$"));
      expect(JSON.parse(options.body)).toEqual({ token: "opaque-token" });
      expect(options.headers.Authorization).toBeUndefined();
      expect(options.method).toBe("POST");
      expect(options.cache).toBe("no-store");
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );
  it("reenvía una respuesta genérica sin exponer existencia, User o Customer", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ accepted: true, userId: 999 }));
    const response = await email(request({ email: "  persona@example.com " }), action("resend"));
    expect(await response.json()).toEqual({ accepted: true });
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/auth\/email-verification\/resend$/);
    expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toEqual({
      email: "persona@example.com",
    });
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "CASHIER", "DRIVER"])(
    "solicita cambio propio de %s sin tocar el perfil ni Fleet",
    async (role) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 1, name: role } });
      mocks.fetch.mockResolvedValueOnce(Response.json({ verificationPending: true }));
      expect(
        await (
          await changeEmail(request({ email: "nuevo@example.com" }, "account/email-change"))
        ).json(),
      ).toEqual({ verificationPending: true });
      const [url, options] = mocks.fetch.mock.calls[0] ?? [];
      expect(url).toMatch(/users\/profile\/email-change$/);
      expect(options.headers.Authorization).toBe("Bearer private-session");
      expect(JSON.parse(options.body)).toEqual({ email: "nuevo@example.com" });
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each([{}, { token: "" }, { token: "valid", userId: 99 }, { token: "a".repeat(8193) }])(
    "rechaza token/campos inválidos %j",
    async (body) => {
      expect((await email(request(body), action())).status).toBe(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { email: "incorrecto" },
    { email: "nuevo@example.com", customerId: 100 },
    { email: "ACTUAL@example.com" },
  ])("rechaza cambio no válido %j", async (body) => {
    expect((await changeEmail(request(body))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([401, 403, 409, 410, 422, 429, 503])(
    "conserva error HTTP %i, código y correlación sin reenviar",
    async (status) => {
      mocks.fetch.mockResolvedValueOnce(
        Response.json(
          { code: "EMAIL_TOKEN_EXPIRED", detail: "Enlace vencido", correlationId: "correlation-1" },
          { status },
        ),
      );
      const response = await email(request({ token: "expired" }), action());
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({
        code: "EMAIL_TOKEN_EXPIRED",
        correlationId: "correlation-1",
      });
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("acepta el formato message de Identity para conflictos", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ message: "El correo ya está ocupado" }, { status: 409 }),
    );
    const response = await changeEmail(request({ email: "ocupado@example.com" }));
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toBe("El correo ya está ocupado");
  });
  it.each([{}, { emailVerified: false }, { verificationPending: true }])(
    "no confirma verificación con respuesta inesperada %j",
    async (body) => {
      mocks.fetch.mockResolvedValueOnce(Response.json(body));
      expect((await email(request({ token: "token" }), action())).status).toBe(502);
    },
  );
  it("no confirma solicitud de cambio con respuesta vacía", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await changeEmail(request({ email: "nuevo@example.com" }))).status).toBe(502);
  });
  it("no reintenta una escritura con respuesta perdida", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    expect((await email(request({ token: "token" }), action())).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([null, { ...user, isActive: false }, { ...user, resetPassword: true }])(
    "exige cuenta propia activa para solicitar cambio %j",
    async (actor) => {
      mocks.session.mockResolvedValue(actor);
      expect(
        (await changeEmail(request({ email: "nuevo@example.com" }))).status,
      ).toBeGreaterThanOrEqual(400);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it("exige cookie para solicitar cambio", async () => {
    mocks.get.mockReturnValue(undefined);
    expect((await changeEmail(request({ email: "nuevo@example.com" }))).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rechaza origen ajeno y acción inexistente antes de llamar Identity", async () => {
    expect(
      (await email(request({ token: "token" }, undefined, "https://otro.example"), action()))
        .status,
    ).toBe(403);
    expect(
      (
        await changeEmail(
          request({ email: "nuevo@example.com" }, undefined, "https://otro.example"),
        )
      ).status,
    ).toBe(403);
    expect((await email(request({ token: "token" }), action("unknown"))).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    "/auth/verify-email",
    "/auth/confirm-email-change",
    "/auth/resend-verification",
    "/api/auth/email/confirm",
    "/api/auth/email/resend",
    "/api/auth/email/confirm-change",
    "/api/account/email-change",
  ])("habilita sin caché %s", (path) => {
    const result = middleware(new NextRequest("http://localhost:3000" + path));
    expect(result.headers.get("x-middleware-next")).toBe("1");
    expect(result.headers.get("cache-control")).toBe("no-store");
    if (!path.startsWith("/api/account"))
      expect(result.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
