import { POST as recoveryPost } from "@/app/api/auth/recovery/[action]/route";
import { TransportResetPasswordSchema } from "@/lib/validators/auth";
import { POST as registerPost } from "@/app/api/users/register/route";
import { ApplicationError } from "@/types/error";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";
import { TransportLoginRequestSchema, TransportLoginResponseSchema } from "@/lib/validators/auth";
import {
  LoginRequestSchema,
  AuthResponseSchema,
  RegisterRequestSchema,
} from "@/lib/validators/auth";

describe("LoginRequestSchema", () => {
  it("validates a valid login request", () => {
    const result = LoginRequestSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = LoginRequestSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = LoginRequestSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = LoginRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("AuthResponseSchema", () => {
  it("parses a valid auth response", () => {
    const result = AuthResponseSchema.safeParse({
      accessToken: "eyJhbGciOiJSUzI1NiJ9.test.token",
      refreshToken: "eyJhbGciOiJSUzI1NiJ9.refresh.token",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accessToken).toBe("eyJhbGciOiJSUzI1NiJ9.test.token");
    }
  });

  it("rejects a response missing tokens", () => {
    const result = AuthResponseSchema.safeParse({ accessToken: "token" });
    expect(result.success).toBe(false);
  });

  it("rejects empty token strings", () => {
    const result = AuthResponseSchema.safeParse({
      accessToken: "",
      refreshToken: "refresh",
    });
    expect(result.success).toBe(false);
  });
});

describe("RegisterRequestSchema", () => {
  it("validates a valid registration request", () => {
    const result = RegisterRequestSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      fullName: "Juan Perez",
      organization: "USAC",
      phone: "55551234",
      personalId: "ABC123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects personalId with special characters", () => {
    const result = RegisterRequestSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      fullName: "Juan Perez",
      organization: "USAC",
      phone: "55551234",
      personalId: "ABC-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = RegisterRequestSchema.safeParse({
      email: "user@example.com",
      password: "short",
      fullName: "Juan Perez",
      organization: "USAC",
      phone: "55551234",
      personalId: "ABC123",
    });
    expect(result.success).toBe(false);
  });
});

const loginMocks = vi.hoisted(() => ({ request: vi.fn(), setCookie: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/api/iam", () => ({ transportRequest: loginMocks.request }));
vi.mock("@/lib/auth/cookies", () => ({
  setAccessTokenCookie: loginMocks.setCookie,
  clearAuthCookies: loginMocks.clear,
}));
describe("Acceso por contrato SSOT, HU-ID-01/02/03", () => {
  const credentials = { email: "cliente@example.com", password: "secreto" };
  const user = {
    id: 1,
    email: credentials.email,
    role: { id: 2, name: "CUSTOMER" },
    isActive: true,
    name: "Ana",
    lastName: "Perez",
    twoFactorEnabled: false,
    resetPassword: false,
  };
  const registerBody = {
    person: {
      name: "Ana",
      lastName: "Perez",
      dpi: "1234567890123",
      nit: "1234567",
      phone: "55555555",
      adress: "Guatemala",
    },
    credentials: {
      email: credentials.email,
      password: "password123",
      confirmPassword: "password123",
    },
  };
  function request(body: unknown, origin = "http://localhost:3000") {
    return new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    });
  }
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it("acepta credenciales y rechaza el payload heredado con contraseña en A2F", async () => {
    expect(TransportLoginRequestSchema.safeParse(credentials).success).toBe(true);
    for (const body of [
      { ...credentials, code: "1234" },
      { email: credentials.email },
      { ...credentials, role: "ADMIN" },
    ]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it.each([{ accessToken: "privado" }, { challengeId: "opaque-challenge", requires2FA: true }])(
    "acepta la alternativa de acceso %j",
    (body) => {
      expect(TransportLoginResponseSchema.safeParse(body).success).toBe(true);
    },
  );
  it.each([
    { accessToken: "privado", challengeId: "reto", requires2FA: true },
    { challengeId: "reto", requires2FA: false },
    { requires2FA: true },
    { jwtToken: "legacy", user, twoFactorEnabled: false, resetPassword: false },
  ])("rechaza respuestas de acceso ambiguas o heredadas: %j", (body) => {
    expect(TransportLoginResponseSchema.safeParse(body).success).toBe(false);
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "DRIVER", "CASHIER"])(
    "conserva el acceso para el rol %s y verifica el perfil antes de crear cookie",
    async (role) => {
      loginMocks.request
        .mockResolvedValueOnce({ accessToken: "token-privado" })
        .mockResolvedValueOnce({ ...user, role: { id: 1, name: role } });
      const response = await POST(request(credentials));
      expect(await response.json()).toEqual({ status: "authenticated", redirect: "/" });
      expect(loginMocks.request).toHaveBeenNthCalledWith(1, "auth/login", { body: credentials });
      expect(loginMocks.request).toHaveBeenNthCalledWith(2, "users/profile", {
        token: "token-privado",
      });
      expect(loginMocks.setCookie).toHaveBeenCalledWith("token-privado");
    },
  );
  it("no consulta perfil ni crea acceso mientras hay desafío", async () => {
    loginMocks.request.mockResolvedValueOnce({ challengeId: "desafio", requires2FA: true });
    expect(await (await POST(request(credentials))).json()).toEqual({
      status: "two_factor_required",
      challengeId: "desafio",
    });
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
    expect(loginMocks.clear).toHaveBeenCalledTimes(1);
    expect(loginMocks.request).toHaveBeenCalledTimes(1);
  });
  it("envía solo challengeId y code al endpoint A2F", async () => {
    const body = { challengeId: "desafio", code: "1234" };
    loginMocks.request.mockResolvedValueOnce({ accessToken: "token" }).mockResolvedValueOnce(user);
    expect((await POST(request(body))).status).toBe(200);
    expect(loginMocks.request).toHaveBeenNthCalledWith(1, "auth/login/tfa", { body });
  });
  it("rechaza un segundo desafío como resultado de verificar el primero", async () => {
    loginMocks.request.mockResolvedValueOnce({ challengeId: "otro", requires2FA: true });
    expect((await POST(request({ challengeId: "desafio", code: "1234" }))).status).toBe(502);
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it.each([{ ...user, isActive: false }, { ...user, role: { id: 1, name: "PARTICIPANT" } }, {}])(
    "no concede sesión con perfil inválido %j",
    async (profile) => {
      loginMocks.request
        .mockResolvedValueOnce({ accessToken: "token" })
        .mockResolvedValueOnce(profile);
      expect((await POST(request(credentials))).status).toBeGreaterThanOrEqual(400);
      expect(loginMocks.setCookie).not.toHaveBeenCalled();
    },
  );
  it("conserva la recuperación cuando el perfil exige cambiar clave", async () => {
    loginMocks.request
      .mockResolvedValueOnce({ accessToken: "token" })
      .mockResolvedValueOnce({ ...user, resetPassword: true });
    expect((await (await POST(request(credentials))).json()).status).toBe(
      "password_reset_required",
    );
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it.each([401, 403, 409, 422, 503])(
    "conserva error %i de Identity sin repetir el acceso",
    async (status) => {
      loginMocks.request.mockRejectedValueOnce(
        new ApplicationError("system.internal_error", status, "Rechazado", {
          code: "IDENTITY_ERROR",
          correlationId: "correlation-1",
        }),
      );
      const response = await POST(request(credentials));
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({
        code: "IDENTITY_ERROR",
        correlationId: "correlation-1",
      });
      expect(loginMocks.request).toHaveBeenCalledTimes(1);
      expect(loginMocks.setCookie).not.toHaveBeenCalled();
    },
  );
  it("rechaza otro origen antes de contactar Identity", async () => {
    expect((await POST(request(credentials, "https://otro.example"))).status).toBe(403);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it("registra CUSTOMER con campos canónicos sin confirmar contraseña ni rol en upstream", async () => {
    loginMocks.request.mockResolvedValueOnce({
      userId: 100,
      customerId: 700,
      emailVerificationRequired: true,
    });
    const response = await registerPost(request(registerBody));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      status: "registered",
      emailVerificationRequired: true,
    });
    expect(loginMocks.request).toHaveBeenCalledWith("auth/register", {
      body: {
        name: "Ana",
        lastName: "Perez",
        dpi: "1234567890123",
        nit: "1234567",
        phone: "55555555",
        address: "Guatemala",
        email: credentials.email,
        password: "password123",
      },
    });
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it.each([
    { ...registerBody, role: "ADMIN" },
    { ...registerBody, person: { ...registerBody.person, nit: " cf " } },
    { ...registerBody, credentials: { ...registerBody.credentials, confirmPassword: "otra" } },
  ])("rechaza alta no personal, roles o claves diferentes %j", async (body) => {
    expect((await registerPost(request(body))).status).toBe(400);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it.each([{}, { userId: 1, customerId: 7, emailVerificationRequired: false }])(
    "no anuncia alta sin verificación %j",
    async (body) => {
      loginMocks.request.mockResolvedValueOnce(body);
      expect((await registerPost(request(registerBody))).status).toBe(502);
      expect(loginMocks.setCookie).not.toHaveBeenCalled();
    },
  );
  it("mantiene conflicto al registrar cuenta existente", async () => {
    loginMocks.request.mockRejectedValueOnce(
      new ApplicationError("resource.conflict", 409, "Cuenta existente"),
    );
    expect((await registerPost(request(registerBody))).status).toBe(409);
    expect(loginMocks.request).toHaveBeenCalledTimes(1);
  });
});

describe("Recuperacion de contrasena", () => {
  const body = {
    token: "header.payload.signature",
    password: "nueva123",
    confirmPassword: "nueva123",
  };
  const user = {
    id: 1,
    email: "ana@example.com",
    role: { id: 2, name: "CUSTOMER" },
    isActive: true,
    name: "Ana",
    lastName: "Perez",
    twoFactorEnabled: false,
    resetPassword: false,
  };
  function request(data: unknown, origin = "http://localhost:3000") {
    return new NextRequest("http://localhost:3000/api/auth/recovery/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(data),
    });
  }
  function context(action: string) {
    return { params: Promise.resolve({ action }) };
  }
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it("rechaza claves distintas, limites incorrectos y tokens invalidos", () => {
    for (const changed of [
      { confirmPassword: "distinta" },
      { password: "12345" },
      { password: "a".repeat(21) },
      { token: "1234" },
    ])
      expect(TransportResetPasswordSchema.safeParse({ ...body, ...changed }).success).toBe(false);
  });
  it("solicita correo aceptando respuesta vacia", async () => {
    loginMocks.request.mockResolvedValue(null);
    const response = await recoveryPost(request({ email: "ana@example.com" }), context("forgot"));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("sent");
    expect(loginMocks.request).toHaveBeenCalledWith("auth/forgot-password", {
      body: { email: "ana@example.com" },
    });
  });
  it("no revela si una cuenta no existe", async () => {
    loginMocks.request.mockRejectedValue(
      new ApplicationError("resource.not_found", 404, "No existe"),
    );
    const response = await recoveryPost(request({ email: "ana@example.com" }), context("forgot"));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("sent");
  });
  it("envia el token separado del cuerpo y borra la sesion al cambiar clave", async () => {
    loginMocks.request.mockResolvedValue(user);
    const response = await recoveryPost(request(body), context("reset"));
    expect(response.status).toBe(200);
    expect(loginMocks.request).toHaveBeenCalledWith("users/reset-password", {
      token: body.token,
      body: { password: body.password, confirmPassword: body.confirmPassword },
    });
    expect(loginMocks.clear).toHaveBeenCalledOnce();
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it("rechaza un enlace vencido sin confirmar el cambio", async () => {
    loginMocks.request.mockRejectedValue(
      new ApplicationError("auth.token_expired", 401, "Enlace vencido"),
    );
    expect((await recoveryPost(request(body), context("reset"))).status).toBe(401);
    expect(loginMocks.clear).not.toHaveBeenCalled();
  });
  it("rechaza origen externo y datos invalidos sin llamar al servicio", async () => {
    expect(
      (await recoveryPost(request(body, "https://otro.example"), context("reset"))).status,
    ).toBe(403);
    expect((await recoveryPost(request({}), context("reset"))).status).toBe(400);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it("el cliente soporta 204 y transmite el Bearer de recuperacion", async () => {
    const actual = await vi.importActual<typeof import("@/lib/api/iam")>("@/lib/api/iam");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json(user));
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(
        await actual.transportRequest("auth/forgot-password", {
          body: { email: "ana@example.com" },
        }),
      ).toBeNull();
      await actual.transportRequest("users/reset-password", {
        token: body.token,
        body: { password: body.password, confirmPassword: body.confirmPassword },
      });
      expect(fetchMock.mock.calls[1]?.[1].headers.Authorization).toBe(`Bearer ${body.token}`);
      expect(fetchMock.mock.calls[1]?.[1].body).not.toContain(body.token);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
