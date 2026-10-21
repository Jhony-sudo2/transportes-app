import { POST as recoveryPost } from "@/app/api/auth/recovery/[action]/route";
import { TransportResetPasswordSchema } from "@/lib/validators/auth";
import { POST as registerPost } from "@/app/api/users/register/route";
import { TransportRegisterRequestSchema } from "@/lib/validators/auth";
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

describe("Contratos de login de Transportes Guatemala", () => {
  it("acepta credenciales y código de segundo factor", () => {
    expect(
      TransportLoginRequestSchema.safeParse({
        email: "cliente@example.com",
        password: "secreto",
        code: "1234",
      }).success,
    ).toBe(true);
  });
  it("rechaza código vac?o y contraseña fuera del l?mite del backend", () => {
    expect(
      TransportLoginRequestSchema.safeParse({
        email: "cliente@example.com",
        password: "secreto",
        code: "",
      }).success,
    ).toBe(false);
    expect(
      TransportLoginRequestSchema.safeParse({
        email: "cliente@example.com",
        password: "a".repeat(101),
      }).success,
    ).toBe(false);
  });
  it("admite desaf?o sin token y cambio obligatorio de contraseña", () => {
    expect(
      TransportLoginResponseSchema.safeParse({
        twoFactorEnabled: true,
        user: null,
        jwtToken: null,
        resetPassword: false,
      }).success,
    ).toBe(true);
    expect(
      TransportLoginResponseSchema.safeParse({
        twoFactorEnabled: null,
        user: null,
        jwtToken: null,
        resetPassword: true,
      }).success,
    ).toBe(true);
  });
  it("acepta IDs numéricos y roles reales del servicio", () => {
    const user = {
      id: 1,
      email: "cliente@example.com",
      role: { id: 2, name: "CUSTOMER" },
      isActive: true,
      name: "Ana",
      lastName: "Pérez",
      twoFactorEnabled: false,
      resetPassword: false,
      branchIds: [],
      customerId: 1,
    };
    expect(
      TransportLoginResponseSchema.safeParse({
        twoFactorEnabled: null,
        user,
        jwtToken: "jwt",
        resetPassword: false,
      }).success,
    ).toBe(true);
    expect(
      TransportLoginResponseSchema.safeParse({
        twoFactorEnabled: null,
        user: { ...user, role: { id: 2, name: "PARTICIPANT" } },
        jwtToken: "jwt",
        resetPassword: false,
      }).success,
    ).toBe(false);
  });
});

const loginMocks = vi.hoisted(() => ({ request: vi.fn(), setCookie: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/api/iam", () => ({ transportRequest: loginMocks.request }));
vi.mock("@/lib/auth/cookies", () => ({
  setAccessTokenCookie: loginMocks.setCookie,
  clearAuthCookies: loginMocks.clear,
}));
describe("BFF de login de Transportes Guatemala", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  function request(body: unknown, origin = "http://localhost:3000") {
    return new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    });
  }
  const credentials = { email: "cliente@example.com", password: "secreto" };
  const user = {
    id: 1,
    email: "cliente@example.com",
    role: { id: 2, name: "CUSTOMER" },
    isActive: true,
    name: "Ana",
    lastName: "Perez",
    twoFactorEnabled: false,
    resetPassword: false,
  };
  it("guarda el JWT sin exponerlo en la respuesta", async () => {
    loginMocks.request.mockResolvedValue({
      twoFactorEnabled: null,
      user,
      jwtToken: "token-privado",
      resetPassword: false,
    });
    const response = await POST(request(credentials));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "authenticated", redirect: "/" });
    expect(loginMocks.setCookie).toHaveBeenCalledWith("token-privado");
  });
  it("no concede acceso antes del segundo factor", async () => {
    loginMocks.request.mockResolvedValue({
      twoFactorEnabled: true,
      user,
      jwtToken: null,
      resetPassword: false,
    });
    const response = await POST(request(credentials));
    expect(await response.json()).toEqual({ status: "two_factor_required" });
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it("envia el codigo al endpoint de segundo factor", async () => {
    loginMocks.request.mockResolvedValue({
      twoFactorEnabled: null,
      user,
      jwtToken: "token",
      resetPassword: false,
    });
    await POST(request({ ...credentials, code: "1234" }));
    expect(loginMocks.request).toHaveBeenCalledWith("auth/login/tfa", {
      body: { ...credentials, code: "1234" },
    });
  });
  it("no crea sesion si se requiere cambiar la clave", async () => {
    loginMocks.request.mockResolvedValue({
      twoFactorEnabled: null,
      user,
      jwtToken: null,
      resetPassword: true,
    });
    const response = await POST(request(credentials));
    expect((await response.json()).status).toBe("password_reset_required");
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it("rechaza solicitudes de otro origen antes de llamar al backend", async () => {
    expect((await POST(request(credentials, "https://otro.example"))).status).toBe(403);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it("rechaza credenciales incompletas", async () => {
    expect((await POST(request({ email: "incorrecto" }))).status).toBe(400);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
});

describe("Registro de clientes de Transportes Guatemala", () => {
  const body = {
    person: {
      name: "Ana",
      lastName: "Perez",
      dpi: "1234567890123",
      nit: "1234567",
      phone: "55555555",
      adress: "Guatemala",
    },
    credentials: {
      email: "ana@example.com",
      password: "password123",
      confirmPassword: "password123",
    },
  };
  function request(data: unknown, origin = "http://localhost:3000") {
    return new NextRequest("http://localhost:3000/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(data),
    });
  }
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("rechaza contrasenas diferentes, datos vacios y limites excedidos", () => {
    expect(
      TransportRegisterRequestSchema.safeParse({
        ...body,
        credentials: { ...body.credentials, confirmPassword: "otra" },
      }).success,
    ).toBe(false);
    expect(
      TransportRegisterRequestSchema.safeParse({ ...body, person: { ...body.person, name: "   " } })
        .success,
    ).toBe(false);
    expect(
      TransportRegisterRequestSchema.safeParse({
        ...body,
        person: { ...body.person, adress: "a".repeat(101) },
      }).success,
    ).toBe(false);
  });
  it("registra sin exponer datos ni crear cookies y descarta roles enviados", async () => {
    loginMocks.request.mockResolvedValue({
      id: 1,
      customerId: 1,
      email: "ana@example.com",
      role: { id: 2, name: "CUSTOMER" },
      isActive: true,
      name: "Ana",
      lastName: "Perez",
      twoFactorEnabled: false,
      resetPassword: false,
      branchIds: [],
    });
    const response = await registerPost(request({ ...body, role: "ADMIN" }));
    expect(response.status).toBe(201);
    expect((await response.json()).status).toBe("registered");
    expect(loginMocks.request).toHaveBeenCalledWith("auth/register", { body });
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
  });
  it("rechaza solicitudes de otro origen", async () => {
    expect((await registerPost(request(body, "https://otro.example"))).status).toBe(403);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it("no llama al backend para datos invalidos", async () => {
    expect((await registerPost(request({}))).status).toBe(400);
    expect(loginMocks.request).not.toHaveBeenCalled();
  });
  it("mantiene el conflicto por cuenta duplicada", async () => {
    loginMocks.request.mockRejectedValue(
      new ApplicationError("resource.conflict", 409, "Cuenta duplicada"),
    );
    expect((await registerPost(request(body))).status).toBe(409);
  });
  it("no confirma un registro si el backend devuelve una respuesta inesperada", async () => {
    loginMocks.request.mockResolvedValue({});
    expect((await registerPost(request(body))).status).toBe(502);
    expect(loginMocks.setCookie).not.toHaveBeenCalled();
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
