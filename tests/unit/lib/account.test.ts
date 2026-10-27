// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as profile, PUT as update } from "@/app/api/account/profile/route";
import { POST as password } from "@/app/api/account/password/route";
import { GET as operation } from "@/app/api/account/profile/operations/[operationId]/route";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, delete: mocks.remove }),
}));
const user = {
  id: 7,
  name: "Ana",
  lastName: "Original",
  email: "ana@example.com",
  phone: "55555555",
  dpi: "1234567890123",
  nit: "NIT-1",
  adress: "Centro",
  isActive: true,
  resetPassword: false,
  twoFactorEnabled: true,
  role: { id: 2, name: "CUSTOMER" },
  branchIds: [],
};
const fields = {
  name: "Ana",
  lastName: "Nueva",
  email: "nueva@example.com",
  phone: "55550000",
  dpi: user.dpi,
  nit: "NIT-2",
  adress: "Nueva direccion",
};
const driver = {
  id: 31,
  name: user.name,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  dpi: user.dpi,
  nit: user.nit,
  userId: 7,
  photo: "stored-photo",
  status: "ACTIVE",
  pendingOperationId: null,
};
const opId = "550e8400-e29b-41d4-a716-446655440000";
const op = {
  operationId: opId,
  driverId: 31,
  action: "UPDATE",
  status: "PENDING",
  failureReason: null,
};
const passwordFields = {
  currentPassword: "actual123",
  password: "nueva123",
  confirmPassword: "nueva123",
};
function request(body: unknown, path = "profile", origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/account/" + path, {
    method: path === "password" ? "POST" : "PUT",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function multipartRequest(photo?: Blob | string, data: unknown = fields) {
  const body = new FormData();
  body.append(
    "request",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
    "request.json",
  );
  if (photo !== undefined) {
    if (typeof photo === "string") body.append("photo", photo);
    else body.append("photo", photo, "profile.png");
  }
  return new NextRequest("http://localhost:3000/api/account/profile", {
    method: "PUT",
    headers: { Origin: "http://localhost:3000" },
    body,
  });
}
const operationRequest = () =>
  new NextRequest("http://localhost:3000/api/account/profile/operations/" + opId);
const operationContext = (operationId = opId) => ({ params: Promise.resolve({ operationId }) });

describe("Cuenta propia por rol", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.get.mockReturnValue({ value: "private-session" });
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "DRIVER", "CAJERO"])(
    "consulta perfil de %s sin usar un identificador del navegador",
    async (role) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 1, name: role } });
      if (role === "DRIVER") mocks.fetch.mockResolvedValueOnce(Response.json(driver));
      const response = await profile();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user.id).toBe(7);
      expect(body.user.adress).toBe("Centro");
      expect(body.driver).toEqual(role === "DRIVER" ? driver : null);
      if (role === "DRIVER")
        expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/drivers\/me$/);
      else expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );

  it("un rechazo de Fleet no invalida una sesión que Identity ya verificó", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    const response = await profile();
    expect(response.status).toBe(502);
    expect((await response.json()).detail).toContain("perfil de chofer en Fleet");
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "CAJERO"])(
    "actualiza datos propios de %s y conserva su segundo factor",
    async (role) => {
      const actor = { ...user, role: { id: 1, name: role } };
      mocks.session.mockResolvedValue(actor);
      mocks.fetch.mockResolvedValueOnce(Response.json({ ...actor, ...fields }));
      const response = await update(request(fields));
      expect(response.status).toBe(200);
      expect((await response.json()).status).toBe("updated");
      const [url, options] = mocks.fetch.mock.calls[0] ?? [];
      expect(url).toMatch(/\/api\/v1\/users\/7$/);
      expect(options.method).toBe("PUT");
      expect(options.headers.Authorization).toBe("Bearer private-session");
      const { dpi: _dpi, ...payload } = fields;
      expect(JSON.parse(options.body)).toEqual({ ...payload, twoFactorEnabled: true });
    },
  );

  it("el chofer se actualiza por Fleet y devuelve una referencia pendiente", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(
        Response.json({ ...driver, pendingOperationId: opId }, { status: 202 }),
      );
    const response = await update(request(fields));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "pending", operationId: opId });
    expect(mocks.fetch.mock.calls[0]?.[0]).toMatch(/\/drivers\/me$/);
    const [url, options] = mocks.fetch.mock.calls[1] ?? [];
    expect(url).toMatch(/\/api\/v1\/drivers\/31$/);
    expect(options.method).toBe("PUT");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers["Content-Type"]).toBeUndefined();
    const part = options.body.get("request");
    if (!(part instanceof Blob)) throw new Error("Falta la parte JSON del perfil.");
    expect(part.type).toBe("application/json");
    expect(JSON.parse(await part.text())).toEqual({ ...fields, photo: "stored-photo" });
    expect(options.body.has("photo")).toBe(false);
    expect(mocks.fetch.mock.calls.some(([url]) => String(url).includes("/api/v1/users/"))).toBe(
      false,
    );
  });

  it("envía la fotografía opcional validada junto con los datos de su propio chofer", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(
        Response.json({ ...driver, pendingOperationId: opId }, { status: 202 }),
      );
    const image = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], {
      type: "image/png",
    });
    expect((await update(multipartRequest(image))).status).toBe(202);
    const [url, options] = mocks.fetch.mock.calls[1] ?? [];
    expect(url).toMatch(/drivers\/31$/);
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer private-session");
    expect(options.headers["Content-Type"]).toBeUndefined();
    const photo = options.body.get("photo");
    if (!(photo instanceof Blob)) throw new Error("Falta la foto.");
    expect(photo.type).toBe("image/png");
    expect(new Uint8Array(await photo.arrayBuffer())).toEqual(
      new Uint8Array(await image.arrayBuffer()),
    );
    const part = options.body.get("request");
    if (!(part instanceof Blob)) throw new Error("Faltan los datos.");
    expect(JSON.parse(await part.text())).toEqual({ ...fields, photo: driver.photo });
  });

  it("acepta multipart sin foto y conserva la URL actual en los datos enviados", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(
        Response.json({ ...driver, pendingOperationId: opId }, { status: 202 }),
      );
    expect((await update(multipartRequest())).status).toBe(202);
    expect(mocks.fetch.mock.calls[1]?.[1].body.has("photo")).toBe(false);
  });

  it.each([
    [new Blob([], { type: "image/png" }), 400],
    [new Blob(["svg"], { type: "image/svg+xml" }), 400],
    [new Blob(["no es una imagen"], { type: "image/png" }), 400],
    [new Blob([new Uint8Array(1024 * 1024 + 1)], { type: "image/png" }), 413],
    ["https://otro.example/photo.png", 400],
  ])("rechaza una foto inválida antes de contactar a Fleet", async (photo, status) => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    expect((await update(multipartRequest(photo as Blob | string))).status).toBe(status);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("no permite un formulario de fotografía para los demás roles", async () => {
    expect((await update(multipartRequest())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rechaza referencias de foto o identificadores dentro de los datos del navegador", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    expect(
      (
        await update(
          multipartRequest(undefined, { ...fields, photo: "https://otro.example/photo" }),
        )
      ).status,
    ).toBe(400);
    expect((await update(multipartRequest(undefined, { ...fields, driverId: 99 }))).status).toBe(
      400,
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("bloquea una nueva actualizacion mientras el chofer tiene una operacion pendiente", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...driver, pendingOperationId: opId }));
    expect((await update(request(fields))).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("rechaza choferes vinculados a otra cuenta antes de editar o consultar", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch.mockImplementation(async () => Response.json({ ...driver, userId: 99 }));
    expect((await profile()).status).toBe(403);
    expect((await update(request(fields))).status).toBe(403);
    expect((await operation(operationRequest(), operationContext())).status).toBe(403);
    expect(mocks.fetch.mock.calls.every(([url]) => String(url).endsWith("/drivers/me"))).toBe(true);
  });

  it.each([
    { id: 99, userId: 7, pendingOperationId: opId },
    { id: 31, userId: 99, pendingOperationId: opId },
    { id: 31, userId: 7, pendingOperationId: null },
  ])("no confirma respuestas incorrectas de Fleet: %j", async (changed) => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(Response.json({ ...driver, ...changed }));
    expect((await update(request(fields))).status).toBe(502);
  });

  it("consulta solo operaciones UPDATE de su propio chofer", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(Response.json(op));
    const response = await operation(operationRequest(), operationContext());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(op);
    expect(mocks.fetch.mock.calls[1]?.[0]).toMatch(
      new RegExp("/drivers/31/operations/" + opId + "$"),
    );
  });

  it.each([
    { ...op, driverId: 99 },
    { ...op, operationId: "550e8400-e29b-41d4-a716-446655440001" },
  ])("no revela una operacion ajena", async (result) => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(Response.json(result));
    expect((await operation(operationRequest(), operationContext())).status).toBe(403);
  });

  it("no admite una operacion de creacion ni referencias invalidas", async () => {
    mocks.session.mockResolvedValue({ ...user, role: { id: 4, name: "DRIVER" } });
    mocks.fetch
      .mockResolvedValueOnce(Response.json(driver))
      .mockResolvedValueOnce(Response.json({ ...op, action: "CREATE" }));
    expect((await operation(operationRequest(), operationContext())).status).toBe(502);
    mocks.fetch.mockResolvedValueOnce(Response.json(driver));
    expect((await operation(operationRequest(), operationContext("invalid"))).status).toBe(400);
  });

  it("otro rol no puede consultar operaciones de chofer", async () => {
    expect((await operation(operationRequest(), operationContext())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("valida origen, campos permitidos y DPI conservado en cuentas normales", async () => {
    expect((await update(request(fields, "profile", "https://otro.example"))).status).toBe(403);
    for (const extra of [
      { id: 99 },
      { userId: 99 },
      { roleId: 1 },
      { twoFactorEnabled: false },
      { baseSalary: 9999 },
    ])
      expect((await update(request({ ...fields, ...extra }))).status).toBe(400);
    expect((await update(request({ ...fields, dpi: "otro-dpi" }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("no confirma un perfil devuelto con datos distintos", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(user));
    expect((await update(request(fields))).status).toBe(502);
  });

  it("conserva conflictos del servicio sin reenviar la actualizacion", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ message: "NIT duplicado" }, { status: 409 }));
    const response = await update(request(fields));
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toBe("NIT duplicado");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([null, { ...user, isActive: false }])("requiere una sesion activa", async (actor) => {
    mocks.session.mockResolvedValue(actor);
    expect((await profile()).status).toBe(401);
    expect((await update(request(fields))).status).toBe(401);
    expect((await password(request(passwordFields, "password"))).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("requiere cookie y haber completado el primer acceso", async () => {
    mocks.get.mockReturnValue(undefined);
    expect((await profile()).status).toBe(401);
    mocks.get.mockReturnValue({ value: "private-session" });
    mocks.session.mockResolvedValue({ ...user, resetPassword: true });
    expect((await profile()).status).toBe(403);
    expect((await password(request(passwordFields, "password"))).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("cambia la contraseña de su cuenta y solo cierra la sesion local tras el 204", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await password(request(passwordFields, "password"));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("changed");
    const [url, options] = mocks.fetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/api\/v1\/users\/profile\/password$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(passwordFields);
    expect(options.headers.Authorization).toBe("Bearer private-session");
    expect(mocks.remove.mock.calls.map(([name]) => name)).toEqual([
      "access_token",
      "refresh_token",
      "managed_branch_id",
    ]);
  });

  it("una contraseña actual incorrecta mantiene la sesion y muestra el error", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ message: "La contraseña actual no es correcta." }, { status: 400 }),
    );
    const response = await password(request(passwordFields, "password"));
    expect(response.status).toBe(400);
    expect((await response.json()).detail).toBe("La contraseña actual no es correcta.");
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("no cierra sesion ni anuncia exito ante una respuesta de contraseña inesperada", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ changed: true }));
    expect((await password(request(passwordFields, "password"))).status).toBe(502);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("rechaza claves distintas, repetidas, fuera de limite y campos ajenos", async () => {
    for (const changed of [
      { confirmPassword: "otra" },
      { password: "corta" },
      { password: "a".repeat(21) },
      { password: "actual123", confirmPassword: "actual123" },
      { userId: 99 },
    ])
      expect((await password(request({ ...passwordFields, ...changed }, "password"))).status).toBe(
        400,
      );
    expect(
      (await password(request(passwordFields, "password", "https://otro.example"))).status,
    ).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
