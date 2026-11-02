"use client";
import { useState } from "react";
import type { PosCustomer } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readCustomerResponse } from "@/hooks/useCustomerData";
import {
  PosCustomerSchema,
  CustomerSuggestionSchema,
  CounterCustomerInputSchema,
  ContactInputSchema,
} from "@/lib/validators/commerce";
import { OperationForm } from "./OperationForm";
export function PosBuyer({
  scope,
  query,
  disabled,
  onChange,
}: {
  scope: string;
  query: string;
  disabled: boolean;
  onChange: (customer: PosCustomer | null, cf: boolean, email: string) => void;
}) {
  const [nit, setNit] = useState(""),
    [customer, setCustomer] = useState<PosCustomer | null>(null),
    [cf, setCf] = useState(false),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [newBuyer, setNewBuyer] = useState(false),
    [suggestions, setSuggestions] = useState<PosCustomer[]>([]),
    [loading, setLoading] = useState(false);
  function choose(value: PosCustomer) {
    setCustomer(value);
    setNit(value.nit);
    setEmail(value.email ?? "");
    setNewBuyer(false);
    setSuggestions([]);
    onChange(value, false, value.hasUser ? "" : (value.email ?? ""));
  }
  async function resolve(value: string) {
    setLoading(true);
    setError("");
    setCustomer(null);
    onChange(null, false, "");
    try {
      const response = await fetch(
        `/api/commerce/customers/by-nit/${encodeURIComponent(value)}${query}`,
        { cache: "no-store" },
      );
      if (response.status === 404) {
        setNewBuyer(true);
        setError("NIT no registrado. Completa los datos del comprador.");
        return;
      }
      choose(PosCustomerSchema.parse(await readCustomerResponse(response)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar el comprador.");
    } finally {
      setLoading(false);
    }
  }
  async function search() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/commerce/customers/search${query}${query ? "&" : "?"}nitPrefix=${encodeURIComponent(nit)}`,
        { cache: "no-store" },
      );
      setSuggestions(
        CustomerSuggestionSchema.array()
          .max(20)
          .parse(await readCustomerResponse(response)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo buscar el NIT.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
      <h2 className="text-xl font-semibold">Comprador</h2>
      <fieldset disabled={disabled || loading} className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={cf}
            onChange={(e) => {
              setCf(e.target.checked);
              setCustomer(null);
              setNewBuyer(false);
              setEmail("");
              onChange(null, e.target.checked, "");
            }}
          />
          Consumidor Final (CF)
        </label>
        {!cf && (
          <>
            <div className="space-y-2">
              <Label htmlFor="pos-nit">NIT del comprador</Label>
              <Input
                id="pos-nit"
                value={nit}
                onChange={(e) => {
                  setNit(e.target.value);
                  setCustomer(null);
                  setNewBuyer(false);
                  onChange(null, false, "");
                }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={nit.trim().length < 3}
                onClick={() => void search()}
              >
                Buscar coincidencias
              </Button>
              <Button
                type="button"
                disabled={!nit.trim() || nit.trim().toUpperCase() === "CF"}
                onClick={() => void resolve(nit.trim())}
              >
                Consultar NIT exacto
              </Button>
            </div>
            {suggestions.map((s) => (
              <Button
                type="button"
                variant="outline"
                key={s.customerId}
                onClick={() => void resolve(s.nit)}
              >
                {s.nit} · {s.fullName}
              </Button>
            ))}
          </>
        )}
        {customer && (
          <dl className="space-y-2 text-sm">
            <div>
              <dt>Nombre fiscal</dt>
              <dd>{customer.fullName}</dd>
            </div>
            <div>
              <dt>NIT</dt>
              <dd>{customer.nit}</dd>
            </div>
            {customer.hasUser && (
              <div>
                <dt>Correo de la cuenta (solo lectura)</dt>
                <dd>{customer.email ?? "El servicio entregará al correo autorizado."}</dd>
              </div>
            )}
          </dl>
        )}
        {(cf || (customer && !customer.hasUser)) && (
          <div className="space-y-2">
            <Label htmlFor="pos-contact">Correo para entrega (opcional)</Label>
            <Input
              id="pos-contact"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onChange(customer, cf, e.target.value);
              }}
            />
            <p className="text-xs text-[var(--tg-muted)]">
              El destinatario deberá confirmar este correo antes de recibir el comprobante. Una
              compra CF no se vincula a una cuenta por correo.
            </p>
          </div>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {newBuyer && !disabled && (
        <OperationForm
          key={nit}
          scope={`${scope}:customer:${nit}`}
          path={`/api/commerce/customers/counter${query}`}
          schema={CounterCustomerInputSchema}
          resultSchema={PosCustomerSchema}
          base={{ nit: nit.trim() }}
          fields={[
            { name: "fullName", label: "Nombre completo" },
            { name: "address", label: "Dirección", optional: true },
            { name: "phone", label: "Teléfono", optional: true },
            { name: "email", label: "Correo de contacto", type: "email", optional: true },
          ]}
          label="Registrar comprador sin cuenta"
          onSaved={choose}
        />
      )}
      {customer && !customer.hasUser && !disabled && (
        <details>
          <summary className="cursor-pointer text-sm underline">
            Actualizar nombre o contacto del comprador
          </summary>
          <div className="mt-4">
            <OperationForm
              scope={`${scope}:contact:${customer.customerId}`}
              path={`/api/commerce/customers/${customer.customerId}/contact${query}${query ? "&" : "?"}nit=${encodeURIComponent(customer.nit)}`}
              method="PATCH"
              schema={ContactInputSchema}
              resultSchema={PosCustomerSchema}
              fields={[
                { name: "fullName", label: "Nombre completo", value: customer.fullName },
                {
                  name: "email",
                  label: "Correo de contacto",
                  type: "email",
                  optional: true,
                  value: customer.email ?? "",
                },
              ]}
              label="Guardar contacto"
              onSaved={choose}
            />
          </div>
        </details>
      )}
    </section>
  );
}
