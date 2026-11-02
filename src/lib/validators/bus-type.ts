import { z } from "zod";
import type { BusType, BusTypeInput } from "@/types/fleet";
import { ManagedBranchIdSchema } from "./branch-context";
const rate = z
  .number()
  .finite()
  .nonnegative("La tarifa no puede ser negativa")
  .max(99999999.9999)
  .refine((value) => Number(value.toFixed(4)) === value, "Usa hasta cuatro decimales");
export const BusTypeInputSchema = z
  .object({
    name: z.string().trim().min(1, "Ingresa el nombre").max(100),
    description: z.string().trim().max(500).optional(),
    capacity: z.number().int().positive("La capacidad debe ser mayor que cero").max(2147483647),
    fuelEstimatePerKm: rate,
    depreciationPerKm: rate,
    suggestedDriverSalaryPerTrip: z
      .number()
      .finite()
      .nonnegative("El salario no puede ser negativo")
      .max(999999999999.99)
      .refine((value) => Number(value.toFixed(2)) === value, "Usa hasta dos decimales"),
    active: z.boolean(),
  })
  .strict() satisfies z.ZodType<BusTypeInput, z.ZodTypeDef, unknown>;
export const BusTypeSchema = BusTypeInputSchema.extend({
  id: ManagedBranchIdSchema,
  description: z.string().nullish(),
}).strip() satisfies z.ZodType<BusType, z.ZodTypeDef, unknown>;
export const BusTypeListSchema = z.array(BusTypeSchema);
// Fleet wire format is distinct from the normalized BFF/UI model.
export const BusTypeResponseSchema = BusTypeSchema.omit({ id: true })
  .extend({ busTypeId: ManagedBranchIdSchema })
  .strip()
  .transform(({ busTypeId, ...type }) => ({ ...type, id: busTypeId }));
export const BusTypeListResponseSchema = z.array(BusTypeResponseSchema);
