import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { BranchWorkspaceProvider } from "@/components/layout/BranchWorkspaceProvider";
import { useIdempotentCommand } from "@/hooks/useIdempotentCommand";
import { TicketPaymentSchema } from "@/lib/validators/commerce";
const fetchMock = vi.fn(),
  schema = z.object({ transactionId: z.number(), balanceAfter: z.number() });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BranchWorkspaceProvider>{children}</BranchWorkspaceProvider>
);
beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe("Recuperación de operaciones monetarias", () => {
  it("recupera el mismo pago web tras un 502 y acepta la respuesta sin sucursal física", async () => {
    const body = { holdId: "original-hold", paymentDate: "2026-11-04" };
    const path = "/api/commerce/payments/tickets";
    fetchMock.mockResolvedValueOnce(
      Response.json({ detail: "Respuesta no verificable" }, { status: 502 }),
    );
    const first = renderHook(() => useIdempotentCommand("checkout:7:web:20:payment"), { wrapper });
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    await act(async () => {
      await first.result.current.execute(path, body, TicketPaymentSchema);
    });
    const key = first.result.current.pending?.key;
    expect(key).toBeTruthy();
    first.unmount();
    const recovered = renderHook(() => useIdempotentCommand("checkout:7:web:20:payment"), {
      wrapper,
    });
    await waitFor(() => expect(recovered.result.current.pending?.key).toBe(key));
    fetchMock.mockResolvedValueOnce(
      Response.json({
        invoiceId: 10,
        totalAmount: 75,
        tickets: [{ ticketId: 11, tripId: 20, seatRow: 1, seatColumn: 1 }],
        sourceBranchId: null,
      }),
    );
    await act(async () => {
      const result = await recovered.result.current.execute(
        path,
        recovered.result.current.pending?.body,
        TicketPaymentSchema,
      );
      expect(result?.invoiceId).toBe(10);
    });
    expect(fetchMock.mock.calls.map(([, options]) => options.headers["Idempotency-Key"])).toEqual([
      key,
      key,
    ]);
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([
      body,
      body,
    ]);
    expect(recovered.result.current.pending).toBeNull();
    expect(sessionStorage.getItem("transport:pending:checkout:7:web:20:payment")).toBeNull();
  });
  it("conserva llave y datos tras pérdida de respuesta y recarga de la página", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network failed"));
    const first = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    await act(async () => {
      await first.result.current.execute("/api/commerce/wallet/recharges", { amount: 25 }, schema);
    });
    const key = first.result.current.pending?.key;
    expect(key).toBeTruthy();
    first.unmount();
    const recovered = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(recovered.result.current.pending?.key).toBe(key));
    fetchMock.mockResolvedValueOnce(Response.json({ transactionId: 1, balanceAfter: 125 }));
    await act(async () => {
      expect(
        await recovered.result.current.execute(
          "/api/commerce/wallet/recharges",
          { amount: 25 },
          schema,
        ),
      ).toEqual({ transactionId: 1, balanceAfter: 125 });
    });
    expect(fetchMock.mock.calls.map((c) => c[1].headers["Idempotency-Key"])).toEqual([key, key]);
    expect(sessionStorage.getItem("transport:pending:wallet:7")).toBeNull();
  });
  it("una sesión vencida durante recuperación no borra la referencia original", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network failed"));
    const hook = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => {
      await hook.result.current.execute("/api/commerce/wallet/recharges", { amount: 25 }, schema);
    });
    const key = hook.result.current.pending?.key;
    fetchMock.mockResolvedValueOnce(Response.json({ detail: "Sesión vencida" }, { status: 401 }));
    await act(async () => {
      await hook.result.current.execute("/api/commerce/wallet/recharges", { amount: 25 }, schema);
    });
    expect(hook.result.current.pending?.key).toBe(key);
    expect(JSON.parse(sessionStorage.getItem("transport:pending:wallet:7") ?? "{}").key).toBe(key);
  });
  it("no sustituye un monto incierto por otro ni crea nueva llave", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network failed"));
    const hook = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => {
      await hook.result.current.execute("/api/commerce/wallet/recharges", { amount: 25 }, schema);
    });
    await act(async () => {
      await hook.result.current.execute("/api/commerce/wallet/recharges", { amount: 50 }, schema);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.pending?.body).toEqual({ amount: 25 });
  });
  it("bloquea dos envíos simultáneos aunque el botón reciba doble clic", async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const hook = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => {
      const first = hook.result.current.execute(
        "/api/commerce/wallet/recharges",
        { amount: 25 },
        schema,
      );
      const second = hook.result.current.execute(
        "/api/commerce/wallet/recharges",
        { amount: 25 },
        schema,
      );
      release(Response.json({ transactionId: 1, balanceAfter: 125 }));
      await Promise.all([first, second]);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("un conflicto de idempotencia nunca habilita un segundo pago con otra llave", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { detail: "Conflicto de referencia", code: "IDEMPOTENCY_CONFLICT" },
        { status: 409 },
      ),
    );
    const hook = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => {
      await hook.result.current.execute("/api/commerce/wallet/recharges", { amount: 25 }, schema);
    });
    expect(hook.result.current.pending).not.toBeNull();
  });
  it("una respuesta incompleta de éxito conserva la operación por confirmar", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ accepted: true }));
    const hook = renderHook(() => useIdempotentCommand("wallet:7"), { wrapper });
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => {
      await hook.result.current.execute("/api/commerce/wallet/recharges", { amount: 25 }, schema);
    });
    expect(hook.result.current.pending).not.toBeNull();
  });
});
