import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchesPageClient } from "@/components/domain/BranchesPageClient";
import type { BranchMapProps } from "@/types/branch-map";
vi.mock("@/components/domain/BranchMap", () => ({
  BranchMap: ({ branches, point, onPointChange }: BranchMapProps) => (
    <div aria-label="Mapa de prueba">
      {branches.map((branch) => (
        <p key={branch.id}>Marcador: {branch.name}</p>
      ))}
      {point && (
        <p>
          Seleccion: {point.latitude},{point.longitude}
        </p>
      )}
      {onPointChange && (
        <button
          type="button"
          onClick={() => onPointChange({ latitude: 14.6349151, longitude: -90.5068821 })}
        >
          Seleccionar punto de prueba
        </button>
      )}
    </div>
  ),
}));
const existing = {
  id: 1,
  name: "Sede Central",
  phone: "55555555",
  latitude: 14.6,
  longitude: -90.5,
  municipalityId: 7,
  departamentId: 1,
  municipalityName: "Guatemala",
  departamentName: "Guatemala",
  indication: "Centro",
};
describe("Formulario de sucursales y mapa", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "PUT") {
        const data = JSON.parse(String(options.body));
        return Response.json({
          ...existing,
          ...data,
          latitude: data.direction.latitude,
          longitude: data.direction.longitude,
        });
      }
      if (url === "/api/admin/branches/1") return Response.json(existing);
      if (options?.method === "POST")
        return Response.json(
          {
            ...existing,
            id: 2,
            ...JSON.parse(String(options.body)),
            latitude: 14.6349151,
            longitude: -90.5068821,
          },
          { status: 201 },
        );
      if (url.includes("departmentId=1")) return Response.json([{ id: 7, name: "Guatemala" }]);
      if (url.includes("departmentId=2"))
        return Response.json([{ id: 9, name: "Antigua Guatemala" }]);
      if (url.includes("/locations"))
        return Response.json([
          { id: 1, name: "Guatemala" },
          { id: 2, name: "Sacatepequez" },
        ]);
      return Response.json([existing]);
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  async function openForm() {
    const user = userEvent.setup();
    render(<BranchesPageClient />);
    await screen.findByText("Marcador: Sede Central");
    await user.click(screen.getByRole("button", { name: "Nueva sucursal" }));
    await within(screen.getByLabelText("Departamento")).findByRole("option", { name: "Guatemala" });
    await user.selectOptions(screen.getByLabelText("Departamento"), "1");
    await within(screen.getByLabelText("Municipio")).findByRole("option", { name: "Guatemala" });
    await user.selectOptions(screen.getByLabelText("Municipio"), "7");
    return user;
  }
  it("carga los marcadores y guarda el punto elegido conservando decimales", async () => {
    const user = await openForm();
    await user.type(screen.getByLabelText("Nombre de la sucursal"), "Nueva sede");
    await user.type(screen.getByLabelText("Teléfono"), "55550000");
    await user.click(screen.getByRole("button", { name: "Seleccionar punto de prueba" }));
    expect(screen.getByLabelText("Latitud")).toHaveValue(14.6349151);
    expect(screen.getByLabelText("Longitud")).toHaveValue(-90.5068821);
    await user.click(screen.getByRole("button", { name: "Guardar sucursal" }));
    await screen.findByText("Sucursal «Nueva sede» guardada correctamente.");
    const sent = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(JSON.parse(sent?.[1].body).direction).toMatchObject({
      latitude: 14.6349151,
      longitude: -90.5068821,
      municipalityId: 7,
    });
    expect(screen.getByText("Marcador: Nueva sede")).toBeInTheDocument();
  });
  it("no guarda sin seleccionar ubicacion y limpia municipio al cambiar departamento", async () => {
    const user = await openForm();
    await user.type(screen.getByLabelText("Nombre de la sucursal"), "Nueva");
    await user.type(screen.getByLabelText("Teléfono"), "55550000");
    await user.click(screen.getByRole("button", { name: "Guardar sucursal" }));
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    await user.selectOptions(screen.getByLabelText("Departamento"), "2");
    await within(screen.getByLabelText("Municipio")).findByRole("option", {
      name: "Antigua Guatemala",
    });
    expect(screen.getByLabelText("Municipio")).toHaveValue("");
  });
  it("conserva punto y formulario ante nombre duplicado", async () => {
    const original = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) =>
      options?.method === "POST"
        ? Response.json({ detail: "Ya existe una sucursal con ese nombre." }, { status: 409 })
        : original?.(url, options),
    );
    const user = await openForm();
    await user.type(screen.getByLabelText("Nombre de la sucursal"), "Duplicada");
    await user.type(screen.getByLabelText("Teléfono"), "55550000");
    await user.click(screen.getByRole("button", { name: "Seleccionar punto de prueba" }));
    await user.click(screen.getByRole("button", { name: "Guardar sucursal" }));
    await waitFor(() =>
      expect(screen.getByText("Ya existe una sucursal con ese nombre.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Nombre de la sucursal")).toHaveValue("Duplicada");
    expect(screen.getByLabelText("Latitud")).toHaveValue(14.6349151);
  });

  async function openEditForm() {
    const user = userEvent.setup();
    render(<BranchesPageClient />);
    await screen.findByText("Marcador: Sede Central");
    await user.click(screen.getByRole("button", { name: "Editar sucursal: Sede Central" }));
    await screen.findByRole("heading", { name: "Editar sucursal" });
    await waitFor(() => expect(screen.getByLabelText("Municipio")).toHaveValue("7"));
    return user;
  }
  it("precarga el detalle y actualiza datos y marcador sin crear otra sucursal", async () => {
    const user = await openEditForm();
    expect(screen.getByLabelText("Departamento")).toHaveValue("1");
    expect(screen.getByLabelText("Nombre de la sucursal")).toHaveValue("Sede Central");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("55555555");
    expect(screen.getByLabelText("Latitud")).toHaveValue(14.6);
    expect(screen.getByLabelText("Longitud")).toHaveValue(-90.5);
    await user.clear(screen.getByLabelText("Nombre de la sucursal"));
    await user.type(screen.getByLabelText("Nombre de la sucursal"), "Sede renovada");
    await user.selectOptions(screen.getByLabelText("Departamento"), "2");
    await within(screen.getByLabelText("Municipio")).findByRole("option", {
      name: "Antigua Guatemala",
    });
    expect(screen.getByLabelText("Municipio")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Municipio"), "9");
    await user.click(screen.getByRole("button", { name: "Seleccionar punto de prueba" }));
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "PUT")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Sucursal «Sede renovada» actualizada correctamente.");
    const sent = fetchMock.mock.calls.find((call) => call[1]?.method === "PUT");
    expect(sent?.[0]).toBe("/api/admin/branches/1");
    expect(JSON.parse(sent?.[1].body).direction).toMatchObject({
      municipalityId: 9,
      latitude: 14.6349151,
      longitude: -90.5068821,
    });
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    expect(screen.getByText("Marcador: Sede renovada")).toBeInTheDocument();
    expect(screen.queryByText("Marcador: Sede Central")).not.toBeInTheDocument();
  });
  it("cancelar descarta el borrador y deja limpia una nueva alta", async () => {
    const user = await openEditForm();
    await user.clear(screen.getByLabelText("Nombre de la sucursal"));
    await user.type(screen.getByLabelText("Nombre de la sucursal"), "Sin guardar");
    await user.click(screen.getByRole("button", { name: "Seleccionar punto de prueba" }));
    await user.click(screen.getByRole("button", { name: "Cancelar edición de sucursal" }));
    expect(screen.getByText("Marcador: Sede Central")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "PUT")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Nueva sucursal" }));
    expect(screen.getByLabelText("Nombre de la sucursal")).toHaveValue("");
    expect(screen.getByLabelText("Departamento")).toHaveValue("");
    expect(screen.getByLabelText("Latitud")).toHaveValue(null);
  });
  it("conserva el borrador y el marcador guardado cuando la actualizacion falla", async () => {
    const original = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) =>
      options?.method === "PUT"
        ? Response.json({ detail: "Sucursal no encontrada." }, { status: 404 })
        : original?.(url, options),
    );
    const user = await openEditForm();
    await user.clear(screen.getByLabelText("Teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "55550000");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Sucursal no encontrada.");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("55550000");
    expect(screen.getByText("Marcador: Sede Central")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });
});
