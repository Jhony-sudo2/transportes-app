import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserForm } from "@/components/domain/CreateUserForm";
const roles = [
  { id: 1, name: "ADMIN" },
  { id: 2, name: "CUSTOMER" },
  { id: 3, name: "SUCURSAL_ADMIN" },
  { id: 5, name: "CAJERO" },
];
describe("Formulario de creacion administrativa", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  async function complete() {
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
      await user.type(screen.getByLabelText(name as string), value as string);
    await user.selectOptions(screen.getByRole("combobox"), "5");
    await user.click(screen.getByRole("button", { name: /^Crear usuario$/ }));
  }
  it("envia los datos del cajero sin contrasena y confirma la creacion", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(roles)).mockResolvedValueOnce(
      Response.json(
        {
          status: "created",
          user: {
            id: 8,
            name: "Juan",
            lastName: "Perez",
            email: "juan@example.com",
            role: { id: 5, name: "CAJERO" },
          },
        },
        { status: 201 },
      ),
    );
    render(<CreateUserForm />);
    await complete();
    expect(await screen.findByRole("heading", { name: "Usuario creado" })).toBeInTheDocument();
    const sent = JSON.parse(fetchMock.mock.calls[1]?.[1].body);
    expect(sent).toEqual({
      person: {
        name: "Juan",
        lastName: "Perez",
        dpi: "1234567890123",
        nit: "1234567",
        phone: "55555555",
        adress: "Guatemala",
      },
      email: "juan@example.com",
      roleId: 5,
    });
    expect(sent).not.toHaveProperty("password");
  });
  it("conserva los datos para corregir un conflicto del servicio", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json(roles))
      .mockResolvedValueOnce(Response.json({ detail: "El DPI ya existe" }, { status: 409 }));
    render(<CreateUserForm />);
    await complete();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("El DPI ya existe"));
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("juan@example.com");
    expect(screen.queryByRole("heading", { name: "Usuario creado" })).not.toBeInTheDocument();
  });
  async function completeCashier() {
    const user = userEvent.setup();
    for (const [name, value] of [
      ["Nombre", "Juan"],
      ["Apellido", "Perez"],
      ["DPI", "1234567890123"],
      ["NIT", "1234567"],
      ["Teléfono", "55555555"],
      ["Dirección", "Guatemala"],
      ["Correo electrónico", "juan@example.com"],
    ])
      await user.type(screen.getByLabelText(name as string), value as string);
    await user.click(screen.getByRole("button", { name: "Crear cajero", exact: true }));
  }
  it("reutiliza los datos personales con rol fijo y sin consultar el catálogo de admin", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          user: {
            id: 8,
            name: "Juan",
            lastName: "Perez",
            email: "juan@example.com",
            role: { id: 5, name: "CAJERO" },
          },
          branchId: 2,
        },
        { status: 201 },
      ),
    );
    render(<CreateUserForm cashierBranch={{ id: 2, name: "Central" }} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await completeCashier();
    expect(await screen.findByRole("heading", { name: "Cajero creado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/branch-admin/cashiers");
    expect(JSON.parse(options.body)).toMatchObject({ branchId: 2, email: "juan@example.com" });
    expect(JSON.parse(options.body)).not.toHaveProperty("roleId");
    expect(JSON.parse(options.body)).not.toHaveProperty("password");
    await userEvent.click(screen.getByRole("button", { name: "Crear otro cajero" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("bloquea el reenvío cuando no se sabe si la cuenta fue creada", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Conexión interrumpida"));
    render(<CreateUserForm cashierBranch={{ id: 2, name: "Central" }} />);
    await completeCashier();
    expect(await screen.findByRole("alert")).toHaveTextContent("Verifica si la cuenta fue creada");
    expect(screen.getByRole("button", { name: "Crear cajero", exact: true })).toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("juan@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
