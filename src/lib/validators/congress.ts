import { z } from "zod";

export const CongressSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  price: z.number().min(35, "El precio debe ser mayor o igual a Q35.00"),
  institutionId: z.string().uuid(),
  institutionName: z.string(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CongressListSchema = z.object({
  items: z.array(CongressSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const CreateCongressSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripcion es requerida"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  location: z.string().min(1, "La ubicacion es requerida"),
  price: z.number().min(35, "El precio debe ser mayor o igual a Q35.00"),
  institutionId: z.string().uuid("La institucion es requerida"),
});

export const UpdateCongressSchema = CreateCongressSchema.partial();

export type CongressData = z.infer<typeof CongressSchema>;
export type CongressListData = z.infer<typeof CongressListSchema>;
export type CreateCongressData = z.infer<typeof CreateCongressSchema>;
export type UpdateCongressData = z.infer<typeof UpdateCongressSchema>;
