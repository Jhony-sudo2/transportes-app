import { z } from "zod";

export const InstitutionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  contactEmail: z.string().email(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const InstitutionListSchema = z.object({
  items: z.array(InstitutionSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripcion es requerida"),
  contactEmail: z.string().email("Correo electronico invalido"),
});

export const UpdateInstitutionSchema = CreateInstitutionSchema.partial();

export type InstitutionData = z.infer<typeof InstitutionSchema>;
export type InstitutionListData = z.infer<typeof InstitutionListSchema>;
export type CreateInstitutionData = z.infer<typeof CreateInstitutionSchema>;
export type UpdateInstitutionData = z.infer<typeof UpdateInstitutionSchema>;
