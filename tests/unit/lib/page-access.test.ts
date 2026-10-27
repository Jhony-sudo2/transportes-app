// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireTransportPageAccess } from "@/lib/auth/page-access";
import { ApplicationError } from "@/types/error";

const mocks = vi.hoisted(() => ({ session: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getTransportSession: mocks.session }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
const user = { id: 7, isActive: true, resetPassword: false, role: { id: 1, name: "ADMIN" } };
describe("Acceso de páginas según el rol actual de Identity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(user);
    mocks.redirect.mockImplementation(() => {
      throw new Error("redirect");
    });
    mocks.notFound.mockImplementation(() => {
      throw new Error("notFound");
    });
  });
  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "DRIVER", "CAJERO"])(
    "permite las páginas compartidas a %s",
    async (role) => {
      const actor = { ...user, role: { id: 1, name: role } };
      mocks.session.mockResolvedValue(actor);
      expect(await requireTransportPageAccess()).toEqual(actor);
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
  it.each(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER"] as const)(
    "permite el grupo de su propio rol %s",
    async (role) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 1, name: role } });
      await expect(requireTransportPageAccess(role)).resolves.toBeDefined();
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );
  it.each(["SUCURSAL_ADMIN", "CUSTOMER", "DRIVER", "CAJERO"])(
    "impide entrar a system-admin como %s",
    async (role) => {
      mocks.session.mockResolvedValue({ ...user, role: { id: 2, name: role } });
      await expect(requireTransportPageAccess("ADMIN")).rejects.toThrow("notFound");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    },
  );
  it("no concede acceso a branch-admin por ser administrador del sistema", async () => {
    await expect(requireTransportPageAccess("SUCURSAL_ADMIN")).rejects.toThrow("notFound");
  });
  it.each([null, { ...user, isActive: false }, { ...user, resetPassword: true }])(
    "envía al login una cuenta sin acceso vigente: %j",
    async (actor) => {
      mocks.session.mockResolvedValue(actor);
      await expect(requireTransportPageAccess()).rejects.toThrow("redirect");
      expect(mocks.redirect).toHaveBeenCalledWith("/login");
    },
  );
  it("conserva un fallo del servicio sin interpretarlo como sesión vencida", async () => {
    const error = new ApplicationError("system.internal_error", 502, "Identity no disponible");
    mocks.session.mockRejectedValue(error);
    await expect(requireTransportPageAccess("ADMIN")).rejects.toBe(error);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
