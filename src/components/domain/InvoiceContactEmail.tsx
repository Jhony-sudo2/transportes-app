"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useTransportMutation } from "@/hooks/useTransportMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const resultSchema = z.object({ contactEmailStatus: z.enum(["VERIFIED", "REJECTED"]) });
export function InvoiceContactEmail({
  action,
  token: initialToken,
}: {
  action: "confirm" | "reject";
  token: string;
}) {
  const [token, setToken] = useState(initialToken),
    [done, setDone] = useState(false),
    mutation = useTransportMutation();
  useEffect(() => {
    history.replaceState(null, "", location.pathname);
  }, []);
  return (
    <div className="space-y-5">
      <p>
        {action === "confirm"
          ? "Confirma esta dirección para recibir el comprobante de la compra. Esto no crea una cuenta ni vincula una compra CF por correo."
          : "Rechaza la entrega si no reconoces la compra. El rechazo no cancela la factura ni entrega sus datos."}
      </p>
      {!initialToken && (
        <div className="space-y-2">
          <Label htmlFor="invoice-token">Código del enlace recibido</Label>
          <Input id="invoice-token" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
      )}
      {done ? (
        <p role="status" className="tg-notice">
          {action === "confirm"
            ? "Correo confirmado para entrega del comprobante."
            : "Entrega por correo rechazada."}
        </p>
      ) : (
        <Button
          disabled={!token || mutation.busy || mutation.uncertain}
          onClick={() =>
            void mutation
              .run(`/api/invoices/contact-email/${action}`, { token }, resultSchema)
              .then((r) => {
                if (r) {
                  setDone(true);
                  setToken("");
                }
              })
          }
        >
          {action === "confirm" ? "Confirmar mi correo de entrega" : "No reconozco esta compra"}
        </Button>
      )}
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </div>
  );
}
