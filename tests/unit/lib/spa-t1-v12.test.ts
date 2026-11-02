// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import fixture from "../../fixtures/contracts/spa-t1-v12.json";
import {
  TransportProfileResponseSchema,
  TransportResetPasswordSchema,
  TransportRegisterRequestSchema,
} from "@/lib/validators/auth";
import { BusTypeResponseSchema, BusTypeInputSchema } from "@/lib/validators/bus-type";
import { BranchSchema } from "@/lib/validators/branch";
import { POST as recovery } from "@/app/api/auth/recovery/[action]/route";
import { GET as users } from "@/app/api/admin/users/route";
import { GET as catalog } from "@/app/api/journey/branches/route";
import { GET as branchContext, PUT as selectBranch } from "@/app/api/branch-admin/context/route";
import { PATCH as twoFactor } from "@/app/api/account/two-factor/route";
import { PUT as profileUpdate } from "@/app/api/account/profile/route";
import { PATCH as branchStatus } from "@/app/api/admin/branches/[id]/availability/route";
import { readUpstreamProblem } from "@/lib/api/responses";
import { middleware } from "@/middleware";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  fetch: vi.fn(),
  cookie: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie, set: mocks.set, delete: mocks.remove }),
}));
const context = (action: string) => ({ params: Promise.resolve({ action }) });
function request(path: string, body?: unknown, method = "POST") {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe("SPA-T1 aligned to SSOT v12 (contract tests, not real integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.mockResolvedValue(TransportProfileResponseSchema.parse(fixture.profile));
    mocks.cookie.mockImplementation((key: string) => ({
      value: key === "access_token" ? "synthetic-session" : "2",
    }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("normalizes Identity address and retains verification without returning unknown fields", () => {
    const profile = TransportProfileResponseSchema.parse({
      ...fixture.profile,
      passwordHash: "private",
    });
    expect(profile).toMatchObject({ adress: "Guatemala", emailVerified: true });
    expect(profile).not.toHaveProperty("passwordHash");
    expect(profile).not.toHaveProperty("address");
  });
  it.each([12, 100])("accepts reset passwords of %i characters and opaque tokens", (length) => {
    const password = "a".repeat(length);
    expect(
      TransportResetPasswordSchema.safeParse({
        ...fixture.reset,
        password,
        confirmPassword: password,
      }).success,
    ).toBe(true);
  });
  it.each([0, 6, 11, 101])("rejects reset passwords of %i characters", (length) => {
    const password = "a".repeat(length);
    expect(
      TransportResetPasswordSchema.safeParse({
        ...fixture.reset,
        password,
        confirmPassword: password,
      }).success,
    ).toBe(false);
  });
  it.each([11, 101])("applies registration password limits on the BFF input (%i)", (length) => {
    const password = "a".repeat(length);
    expect(
      TransportRegisterRequestSchema.safeParse({
        person: {
          name: "A",
          lastName: "B",
          dpi: "123",
          nit: "123",
          phone: "55555555",
          adress: "C",
        },
        credentials: { email: "example@example.com", password, confirmPassword: password },
      }).success,
    ).toBe(false);
  });
  it("sends recovery token only in the body and accepts 204 without logging in", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await recovery(
      request("/api/auth/recovery/reset", fixture.reset),
      context("reset"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "reset" });
    const [url, options] = mocks.fetch.mock.calls[0]!;
    expect(url).toMatch(/users\/reset-password$/);
    expect(options.headers.Authorization).toBeUndefined();
    expect(JSON.parse(options.body)).toEqual(fixture.reset);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith("access_token");
  });
  it("rejects legacy profile responses to a password reset", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(fixture.profile));
    expect(
      (await recovery(request("/api/auth/recovery/reset", fixture.reset), context("reset"))).status,
    ).toBe(502);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 409, 410, 422, 503])(
    "preserves recovery HTTP %i and correlation",
    async (status) => {
      mocks.fetch.mockResolvedValueOnce(
        Response.json(
          { code: "RESET_UNAVAILABLE", message: "Intenta nuevamente", correlationId: "case-1" },
          { status },
        ),
      );
      const response = await recovery(
        request("/api/auth/recovery/reset", fixture.reset),
        context("reset"),
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({
        code: "RESET_UNAVAILABLE",
        correlationId: "case-1",
      });
      expect(mocks.remove).not.toHaveBeenCalled();
    },
  );
  it("normalizes busTypeId and strips extensions without loosening request validation", () => {
    const type = BusTypeResponseSchema.parse({ ...fixture.busType, futureField: true });
    expect(type.id).toBe(4);
    expect(type).not.toHaveProperty("futureField");
    expect(type).not.toHaveProperty("busTypeId");
    const { busTypeId: _id, description: _description, ...input } = fixture.busType;
    expect(BusTypeInputSchema.safeParse({ ...input, injected: 1 }).success).toBe(false);
    expect(
      BusTypeResponseSchema.safeParse({ ...fixture.busType, fuelEstimatePerKm: -1 }).success,
    ).toBe(false);
  });
  it("accepts minimal staff lists and renders optional identity details as unavailable", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(fixture.staff));
    const response = await users(new NextRequest("http://localhost:3000/api/admin/users"));
    expect(response.status).toBe(200);
    expect((await response.json()).content).toEqual([
      {
        id: 31,
        role: { id: 3, name: "SUCURSAL_ADMIN" },
        branchIds: [2],
        isActive: true,
        name: "",
        lastName: "",
        email: "",
      },
    ]);
  });
  it("does not silently return zero matches when the producer omits staff email", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(fixture.staff));
    expect(
      (await users(new NextRequest("http://localhost:3000/api/admin/users?email=example"))).status,
    ).toBe(422);
  });
  it("calls the public catalog without a session token and strips private fields", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json(fixture.catalog.map((branch) => ({ ...branch, phone: "private" }))),
    );
    expect(await (await catalog()).json()).toEqual([{ id: 2, name: "Central" }]);
    const [url, options] = mocks.fetch.mock.calls[0]!;
    expect(url).toMatch(/branches\/catalog$/);
    expect(options.headers.Authorization).toBeUndefined();
  });
  it("refuses inconsistent branch identifiers", () => {
    expect(BranchSchema.safeParse({ ...fixture.branch, id: 99 }).success).toBe(false);
  });
  it("accepts the minimal branch activation response", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ branchId: 2, active: true }));
    const response = await branchStatus(
      request("/api/admin/branches/2/availability", { active: true }, "PATCH"),
      { params: Promise.resolve({ id: "2" }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 2, active: true });
  });
  it("does not offer inactive assigned branches or preserve their selection", async () => {
    mocks.session.mockResolvedValue({
      ...fixture.profile,
      role: { id: 3, name: "SUCURSAL_ADMIN" },
    });
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...fixture.branch, active: false }));
    expect(await (await branchContext()).json()).toEqual({ branches: [], selectedBranchId: null });
  });
  it("does not persist an inactive branch as operational context", async () => {
    mocks.session.mockResolvedValue({
      ...fixture.profile,
      role: { id: 3, name: "SUCURSAL_ADMIN" },
    });
    mocks.fetch.mockResolvedValueOnce(Response.json({ ...fixture.branch, active: false }));
    expect(
      (await selectBranch(request("/api/branch-admin/context", { branchId: 2 }, "PUT"))).status,
    ).toBe(403);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "CAJERO", "DRIVER"])(
    "sends an explicit password-confirmed 2FA state for %s",
    async (name) => {
      const profile = { ...fixture.profile, role: { id: 1, name } };
      mocks.session.mockResolvedValue(profile);
      mocks.fetch.mockResolvedValueOnce(Response.json({ ...profile, twoFactorEnabled: true }));
      const response = await twoFactor(
        request(
          "/api/account/two-factor",
          { twoFactorEnabled: true, currentPassword: "test-password" },
          "PATCH",
        ),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ twoFactorEnabled: true });
      expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toEqual({
        enabled: true,
        currentPassword: "test-password",
      });
    },
  );
  it("requires the current password for 2FA", async () => {
    expect(
      (await twoFactor(request("/api/account/two-factor", { twoFactorEnabled: true }, "PATCH")))
        .status,
    ).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not let profile changes bypass the dedicated password-confirmed 2FA action", async () => {
    const { address, ...profile } = fixture.profile;
    const response = await profileUpdate(
      request(
        "/api/account/profile",
        {
          name: profile.name,
          lastName: profile.lastName,
          email: profile.email,
          nit: profile.nit,
          phone: profile.phone,
          dpi: profile.dpi,
          adress: address,
          twoFactorEnabled: true,
        },
        "PUT",
      ),
    );
    expect(response.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("uses a ProblemDetail message when detail is empty", async () => {
    expect(
      await readUpstreamProblem(
        Response.json(
          {
            detail: "",
            message: "Administrador requerido",
            code: "BRANCH_ADMIN_REQUIRED",
            correlationId: "branch-1",
          },
          { status: 409 },
        ),
        "fallback",
      ),
    ).toEqual({
      detail: "Administrador requerido",
      upstream: { code: "BRANCH_ADMIN_REQUIRED", correlationId: "branch-1" },
    });
  });
  it("does not convert Identity profile 403 into a missing session", async () => {
    const actual = await vi.importActual<typeof import("@/lib/auth/session")>("@/lib/auth/session");
    mocks.fetch.mockResolvedValueOnce(
      Response.json(
        { code: "ROLE_SCOPE", message: "Acceso rechazado", correlationId: "profile-403" },
        { status: 403 },
      ),
    );
    await expect(actual.getTransportSession()).rejects.toMatchObject({
      status: 403,
      upstream: { code: "ROLE_SCOPE", correlationId: "profile-403" },
    });
  });
  it.each([
    "/auth/reset-password",
    "/auth/first-login",
    "/auth/verify-email",
    "/auth/confirm-email-change",
  ])("keeps sensitive link pages uncached and without referrer: %s", (path) => {
    const response = middleware(new NextRequest(`http://localhost:3000${path}?token=synthetic`));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});
