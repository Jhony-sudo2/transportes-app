import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchMapProps } from "@/types/branch-map";
import { AnalyticsWorkspace } from "@/components/domain/AnalyticsWorkspace";

// Leaflet no corre en jsdom: se reemplaza el mapa por una lista de los trazos y marcadores.
vi.mock("@/components/domain/BranchMap", () => ({
  BranchMap: (props: BranchMapProps) => (
    <div data-testid="map">
      {props.segments?.map((s, i) => (
        <p key={i} data-color={s.color} data-dash={s.dashArray ?? ""}>
          {s.label}
        </p>
      ))}
      {props.branches.map((b) => (
        <span key={b.id}>marcador {b.name}</span>
      ))}
    </div>
  ),
}));
const fetchMock = vi.fn();
const branches = [
  { id: 2, name: "Quiché", latitude: 15.03, longitude: -91.15, active: true },
  { id: 3, name: "Xela", latitude: 14.84, longitude: -91.52, active: true },
  { id: 4, name: "Petén", latitude: 16.91, longitude: -89.89, active: true },
];
const names = {
  branches: { "2": "Quiché", "3": "Xela", "4": "Petén" },
  routes: { "1": "Quiché → Xela", "3": "Petén → Quiché" },
  users: { "21": "Carla Cajera" },
  buses: { "6": "P-456DEF · Volvo Touring" },
  drivers: {},
};
const busOptions = [
  {
    id: 6,
    label: "P-456DEF · Volvo Touring",
    busTypeName: "Microbús",
    branchId: 3,
    branchName: "Xela",
  },
  {
    id: 5,
    label: "P-123ABC · Volvo Touring",
    busTypeName: "Pullman",
    branchId: 2,
    branchName: "Quiché",
  },
];
function respond(url: string) {
  const path = new URL(url, "http://localhost").pathname;
  if (path === "/api/analytics/context") return Response.json(branches);
  if (path === "/api/analytics/buses") return Response.json(busOptions);
  if (path === "/api/analytics/income")
    return Response.json({
      kind: "income",
      filters: {},
      names,
      sections: [
        {
          title: "Quiché",
          subtotal: "75.00",
          rows: [{ documentRef: "F-1", amount: "75.00", sellerUserId: 21, sourceBranchId: 3 }],
        },
      ],
      grandTotal: "75.00",
    });
  if (path === "/api/analytics/workshop-categories")
    return Response.json({ kind: "workshop-categories", filters: {}, names, sections: [] });
  if (path === "/api/analytics/route-map")
    return Response.json({
      kind: "route-map",
      filters: { originBranchId: "2" },
      names,
      mapRoutes: [
        {
          routeId: 1,
          origin: { lat: 15.03, lng: -91.15 },
          destination: { lat: 14.84, lng: -91.52 },
        },
      ],
      incomingRoutes: [
        {
          routeId: 3,
          origin: { lat: 16.91, lng: -89.89 },
          destination: { lat: 15.03, lng: -91.15 },
        },
      ],
      sections: [
        {
          title: "Rutas que salen de Quiché (origen)",
          rows: [{ routeId: 1, direction: "Origen" }],
        },
        {
          title: "Rutas que llegan a Quiché (destino)",
          rows: [{ routeId: 3, direction: "Destino" }],
        },
      ],
    });
  return Response.json({ detail: "No previsto" }, { status: 500 });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url: string) => respond(url));
});
afterEach(() => vi.unstubAllGlobals());

describe("Informes globales", () => {
  it("muestra el vendedor y la sucursal por nombre, no por ID", async () => {
    render(<AnalyticsWorkspace />);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Carla Cajera")).toBeInTheDocument();
    expect(within(table).getByText("Xela")).toBeInTheDocument();
    expect(within(table).queryByText("21")).toBeNull();
  });
  it("taller: el bus se elige en un select con nombres agrupados por tipo", async () => {
    const user = userEvent.setup();
    render(<AnalyticsWorkspace />);
    await screen.findByRole("table");
    await user.selectOptions(screen.getByLabelText("Reporte"), "workshop-categories");
    const bus = await screen.findByLabelText("Bus (opcional)");
    expect(bus.tagName).toBe("SELECT");
    expect(screen.queryByRole("spinbutton")).toBeNull();
    await waitFor(() =>
      expect(
        within(bus).getByRole("option", { name: /P-456DEF · Volvo Touring · Xela/ }),
      ).toBeInTheDocument(),
    );
    expect(bus.querySelector('optgroup[label="Tipo: Microbús"]')).not.toBeNull();
    expect(bus.querySelector('optgroup[label="Tipo: Pullman"]')).not.toBeNull();
    // Al elegir sucursal solo quedan sus buses.
    await user.selectOptions(screen.getByLabelText("Sucursal"), "2");
    expect(within(bus).queryByRole("option", { name: /P-456DEF/ })).toBeNull();
    expect(within(bus).getByRole("option", { name: /P-123ABC/ })).toBeInTheDocument();
    // El bus elegido se envía como busId al consultar.
    await user.selectOptions(bus, "5");
    await user.click(screen.getByRole("button", { name: "Consultar reporte" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).startsWith("/api/analytics/workshop-categories?branchId=2&busId=5"),
        ),
      ).toBe(true),
    );
  });
  it("mapa: diferencia rutas donde la sucursal es origen y donde es destino", async () => {
    const user = userEvent.setup();
    render(<AnalyticsWorkspace />);
    await screen.findByRole("table");
    await user.selectOptions(screen.getByLabelText("Reporte"), "route-map");
    const map = await screen.findByTestId("map");
    expect(screen.getByText("Sale de Quiché (origen)")).toBeInTheDocument();
    expect(screen.getByText("Llega a Quiché (destino)")).toBeInTheDocument();
    const outgoing = within(map).getByText("Quiché → Xela · sale de Quiché (origen)");
    const incoming = within(map).getByText("Petén → Quiché · llega a Quiché (destino)");
    expect(outgoing.dataset["dash"]).toBe("");
    expect(incoming.dataset["dash"]).toBe("8 6");
    expect(outgoing.dataset["color"]).not.toBe(incoming.dataset["color"]);
    // Marcadores con el nombre real de las sucursales.
    expect(within(map).getByText("marcador Petén")).toBeInTheDocument();
    expect(within(map).getByText("marcador Xela")).toBeInTheDocument();
    expect(screen.getAllByText("Petén → Quiché").length).toBeGreaterThan(0);
  });
});
