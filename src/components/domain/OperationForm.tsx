"use client";
import { useState } from "react";
import type { z } from "zod";
import type { OperationField } from "@/types/operation-form";
import { useIdempotentCommand } from "@/hooks/useIdempotentCommand";
import { inputToInstant } from "@/lib/transport-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function OperationForm<T>({
  scope,
  path,
  fields,
  schema,
  resultSchema,
  method = "POST",
  label = "Confirmar",
  base = {},
  onSaved,
  confirmation = "Confirmo que los datos son correctos.",
}: {
  scope: string;
  path: string;
  fields: OperationField[];
  schema: z.ZodType<unknown, z.ZodTypeDef, unknown>;
  resultSchema: z.ZodType<T, z.ZodTypeDef, unknown>;
  method?: "POST" | "PATCH" | "PUT";
  label?: string;
  base?: Record<string, unknown>;
  onSaved: (value: T) => void;
  confirmation?: string;
}) {
  const mutation = useIdempotentCommand(scope),
    [validation, setValidation] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    let body: unknown = mutation.pending?.body;
    if (!mutation.pending) {
      const values: Record<string, unknown> = { ...base };
      for (const field of fields) {
        const raw = data.get(field.name);
        if (field.type === "checkbox") {
          values[field.name] = raw === "on";
          continue;
        }
        if ((raw === null || raw === "") && field.optional) continue;
        values[field.name] =
          field.type === "number" || field.numeric
            ? raw === "" || raw === null
              ? Number.NaN
              : Number(raw)
            : field.type === "datetime-local"
              ? inputToInstant(String(raw))
              : String(raw ?? "");
      }
      body = values;
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      setValidation(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    if (!mutation.pending && data.get("_confirmation") !== "on") {
      setValidation("Confirma los datos antes de continuar.");
      return;
    }
    setValidation("");
    const result = await mutation.execute(path, parsed.data, resultSchema, method);
    if (result !== undefined) {
      onSaved(result);
      form.reset();
    }
  }
  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="space-y-4">
      <fieldset
        className="grid gap-4 sm:grid-cols-2"
        disabled={!mutation.ready || mutation.busy || !!mutation.pending}
      >
        {fields.map((f) => (
          <div
            key={f.name}
            className={f.type === "textarea" ? "space-y-2 sm:col-span-2" : "space-y-2"}
          >
            <Label htmlFor={`${scope}-${f.name}`}>
              {f.label}
              {f.optional ? " (opcional)" : ""}
            </Label>
            {f.type === "select" ? (
              <select
                id={`${scope}-${f.name}`}
                name={f.name}
                defaultValue={String(f.value ?? "")}
                className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3"
              >
                <option value="">Selecciona una opción</option>
                {f.choices?.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={`${scope}-${f.name}`}
                name={f.name}
                defaultValue={String(f.value ?? "")}
                className="min-h-24 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] p-3"
              />
            ) : f.type === "checkbox" ? (
              <input
                id={`${scope}-${f.name}`}
                type="checkbox"
                name={f.name}
                defaultChecked={f.value === true}
              />
            ) : (
              <Input
                id={`${scope}-${f.name}`}
                name={f.name}
                type={f.type ?? "text"}
                defaultValue={String(f.value ?? "")}
                min={f.min}
                step={f.step ?? (f.type === "number" ? "any" : undefined)}
              />
            )}
          </div>
        ))}
      </fieldset>
      {!mutation.pending && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="_confirmation" className="mt-1" disabled={mutation.busy} />
          {confirmation}
        </label>
      )}
      {mutation.pending && (
        <p role="status" className="tg-notice">
          Hay una operación por confirmar. Recuperarla conserva los datos y su referencia, sin
          iniciar otro cobro. No repitas una entrega física de efectivo.
        </p>
      )}
      {(validation || mutation.error) && (
        <p role="alert" className="tg-notice">
          {validation || mutation.error}
        </p>
      )}
      <Button type="submit" disabled={!mutation.ready || mutation.busy}>
        {mutation.busy ? "Procesando…" : mutation.pending ? "Recuperar misma operación" : label}
      </Button>
    </form>
  );
}
