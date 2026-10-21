import { z } from "zod";

export const AttendanceSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  personalId: z.string(),
  registeredBy: z.string().uuid(),
  registeredAt: z.string(),
});

export const AttendanceListSchema = z.object({
  items: z.array(AttendanceSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const RegisterAttendanceSchema = z.object({
  activityId: z.string().uuid("La actividad es requerida"),
  personalId: z
    .string()
    .min(1, "La identificacion es requerida")
    .regex(/^[a-zA-Z0-9]+$/, "La identificacion solo admite letras y numeros"),
});

export type AttendanceData = z.infer<typeof AttendanceSchema>;
export type AttendanceListData = z.infer<typeof AttendanceListSchema>;
export type RegisterAttendanceData = z.infer<typeof RegisterAttendanceSchema>;
