import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { CashRefunds } from "@/components/domain/CommerceRefunds";

const fetchMock = vi.fn();
const claim = {
  refundId: 30,
  refundCode: "exact-code",
  ticketId: 11,
  tripId: 20,
  seatRow: 2,
  seatColumn: 3,
  holderName: "Titular de prueba",
  cause: "VOLUNTARY",
  appliedPercent: 75,
  amount: 56.25,
  status: "PENDING",
  operationBranchId: 2,
  cashSettleable: true,
  requiredChecks: ["REFUND_CODE_PRESENTED", "HOLDER_IDENTITY_VERIFIED"],
};
beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
async function findClaim() {
  const user = userEvent.setup();
  render(<CashRefunds userId={7} />);
  await user.type(screen.getByLabelText("Código exacto del comprobante"), "exact-code");
  await user.click(screen.getByRole("button", { name: "Consultar devolución" }));
  await screen.findByText("Titular de prueba");
  return user;
}
describe("Cobro presencial por comprobante", () => {
  it("muestra titular y asiento y exige las comprobaciones antes de confirmar la entrega", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(claim));
    const user = await findClaim();
    expect(screen.getByText(/Fila 2, asiento 3/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pago en efectivo" })).toBeNull();
    await user.click(
      screen.getByLabelText("Verifiqué que se presentó el comprobante con este código"),
    );
    expect(screen.queryByRole("button", { name: "Registrar pago en efectivo" })).toBeNull();
    await user.click(screen.getByLabelText("Verifiqué presencialmente la identidad del titular"));
    await user.click(screen.getByLabelText("Confirmo la entrega física del efectivo"));
    await user.click(
      screen.getByLabelText("Confirmo una única entrega por el importe del reembolso."),
    );
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          ...claim,
          status: "COMPLETED",
          method: "CASH",
          paidBranchId: 2,
          settledAt: "2026-11-04T18:00:00Z",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ...claim,
          status: "COMPLETED",
          method: "CASH",
          paidBranchId: 2,
          settledAt: "2026-11-04T18:00:00Z",
          cashSettleable: false,
          requiredChecks: [],
        }),
      );
    await user.click(screen.getByRole("button", { name: "Registrar pago en efectivo" }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true),
    );
    const write = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(write?.[0]).toBe("/api/commerce/refunds/30/settle-cash");
    expect(JSON.parse(write?.[1].body)).toEqual({ code: "exact-code", delivered: true });
    expect(write?.[1].headers["Idempotency-Key"]).toBeTruthy();
    await screen.findByText(/Pagado por efectivo/);
  });
  it.each([{ cashSettleable: false }, { requiredChecks: ["ADDITIONAL_CHECK"] }])(
    "conserva la consulta sin habilitar pago cuando el servicio exige más condiciones: %j",
    async (extra) => {
      fetchMock.mockResolvedValueOnce(Response.json({ ...claim, ...extra }));
      await findClaim();
      expect(screen.queryByRole("button", { name: "Registrar pago en efectivo" })).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
