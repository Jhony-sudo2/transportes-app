"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuotePriceComponent } from "@/types/rentals";
export function PriceComponentsEditor({
  items,
  onChange,
}: {
  items: QuotePriceComponent[];
  onChange: (items: QuotePriceComponent[]) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Conceptos adicionales</h3>
      {items.map((line, index) => (
        <div key={index} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <div className="space-y-2">
            <Label htmlFor={`price-description-${index}`}>
              Descripción del concepto {index + 1}
            </Label>
            <Input
              id={`price-description-${index}`}
              value={line.description}
              onChange={(e) =>
                onChange(
                  items.map((item, i) =>
                    i === index ? { ...item, description: e.target.value } : item,
                  ),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`price-amount-${index}`}>Monto (Q)</Label>
            <Input
              id={`price-amount-${index}`}
              type="number"
              min={0}
              step="0.01"
              value={Number.isNaN(line.amount) ? "" : line.amount}
              onChange={(e) =>
                onChange(
                  items.map((item, i) =>
                    i === index
                      ? { ...item, amount: e.target.value === "" ? NaN : Number(e.target.value) }
                      : item,
                  ),
                )
              }
            />
          </div>
          <Button
            className="self-end"
            type="button"
            variant="outline"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Quitar concepto {index + 1}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...items, { description: "", amount: 0 }])}
      >
        Agregar concepto
      </Button>
      <p className="text-xs text-[var(--tg-muted)]">
        El estimado y el precio final se confirman en el servicio. Los conceptos no se suman ni
        recalculan en esta pantalla.
      </p>
    </div>
  );
}
