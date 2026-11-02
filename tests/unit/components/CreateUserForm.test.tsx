import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserForm } from "@/components/domain/CreateUserForm";
const roles = [
  { id: 1, name: "ADMIN" },
  { id: 3, name: "SUCURSAL_ADMIN" },
  { id: 5, name: "CAJERO" },
];
const record = {
  id: 8,
  name: "Juan",
  lastName: "Perez",
  email: "juan@example.com",
  role: { id: 5, name: "CAJERO" },
};
describe("Formulario administrativo con asignación de sucursal", () => {
  const fetchMock = vi.fn(),
    save = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") return save(url, options);
      return Response.json(url.endsWith("/roles") ? roles : [{ id: 2, name: "Central" }]);
    });
    save.mockImplementation(async () =>
      Response.json({ status: "created", user: record }, { status: 201 }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  async function complete(branch = true) {
    const user = userEvent.setup();
    await screen.findByRole("option", { name: "Cajero" });
    for (const [name, value] of [
      ["Nombre", "Juan"],
      ["Apellido", "Perez"],
      ["DPI", "1234567890123"],
      ["NIT", "1234567"],
      ["Teléfono", "55555555"],
      ["Dirección", "Guatemala"],
      ["Correo electrónico", "juan@example.com"],
    ])
      await user.type(screen.getByLabelText(String(name)), String(value));
    await user.selectOptions(screen.getByLabelText("Rol del usuario"), "5");
    if (branch) await user.selectOptions(screen.getByLabelText("Sucursal del cajero"), "2");
    await user.click(screen.getByRole("button", { name: /^Crear usuario$/ }));
  }
  it("envía un cajero con su única sucursal y sin contraseña", async () => {
    render(<CreateUserForm />);
    await complete();
    expect(await screen.findByRole("heading", { name: "Usuario creado" })).toBeInTheDocument();
    const data = JSON.parse(save.mock.calls[0]?.[1].body);
    expect(data).toMatchObject({ roleId: 5, branchIds: [2], email: record.email });
    expect(data).not.toHaveProperty("password");
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("requiere sucursal antes de crear al cajero", async () => {
    render(<CreateUserForm />);
    await complete(false);
    expect(await screen.findByRole("alert")).toHaveTextContent("Asigna sucursales");
    expect(save).not.toHaveBeenCalled();
  });
  it("conserva datos para corregir un rechazo conocido", async () => {
    save.mockImplementation(async () =>
      Response.json({ detail: "El DPI ya existe" }, { status: 409 }),
    );
    render(<CreateUserForm />);
    await complete();
    expect(await screen.findByRole("alert")).toHaveTextContent("El DPI ya existe");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(record.email);
    expect(screen.getByRole("button", { name: /^Crear usuario$/ })).toBeEnabled();
  });
  it("impide reenviar cuando se desconoce si la cuenta fue creada", async () => {
    save.mockRejectedValueOnce(new Error("Conexión interrumpida"));
    render(<CreateUserForm />);
    await complete();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Crear usuario$/ })).toBeDisabled(),
    );
    expect(screen.getByRole("link", { name: /Consulta el listado/ })).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
