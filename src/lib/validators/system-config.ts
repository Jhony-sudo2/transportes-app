import { z } from "zod";

export const SystemConfigSchema = z.object({
  commissionPercent: z.number().min(0).max(100),
  updatedBy: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
});

export const UpdateSystemConfigSchema = z.object({
  commissionPercent: z
    .number()
    .min(0, "El porcentaje debe ser mayor o igual a 0")
    .max(100, "El porcentaje debe ser menor o igual a 100"),
});

export type SystemConfigData = z.infer<typeof SystemConfigSchema>;
export type UpdateSystemConfigData = z.infer<typeof UpdateSystemConfigSchema>;
