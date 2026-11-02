import { z } from "zod";
import type * as M from "@/types/maintenance";
import { ManagedBranchIdSchema as id } from "./branch-context";
import { MoneyInputSchema as money, CivilDateSchema } from "./journey";
export const CategoryInputSchema = z
  .object({ name: z.string().trim().min(1).max(120), active: z.boolean() })
  .strict();
export const CategorySchema = CategoryInputSchema.extend({
  categoryId: id,
}).strip() satisfies z.ZodType<M.ExpenseCategory, z.ZodTypeDef, unknown>;
export const WorkshopLineSchema = z
  .object({
    categoryId: id,
    lineType: z.enum(["LABOR", "PART"]),
    description: z.string().trim().min(1).max(255),
    amount: money.refine((n) => n > 0, "Cada detalle necesita un monto positivo"),
  })
  .strict() satisfies z.ZodType<M.WorkshopLine, z.ZodTypeDef, unknown>;
export const WorkshopInputSchema = z
  .object({
    busId: id,
    serviceDate: CivilDateSchema,
    lines: z.array(WorkshopLineSchema).min(1).max(100),
  })
  .strict() satisfies z.ZodType<M.WorkshopInput, z.ZodTypeDef, unknown>;
export const WorkshopServiceSchema = WorkshopInputSchema.extend({
  workshopServiceId: id,
  totalAmount: money,
}).strip() satisfies z.ZodType<M.WorkshopService, z.ZodTypeDef, unknown>;
