import { z } from "zod";

const ActivityTypeSchema = z.enum(["PONENCIA", "TALLER"]);

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  congressId: z.string().uuid(),
  roomId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  type: ActivityTypeSchema,
  startTime: z.string(),
  endTime: z.string(),
  leaders: z.array(z.string().uuid()),
  workshopCapacity: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ActivityListSchema = z.object({
  items: z.array(ActivitySchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const CreateActivitySchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().min(1, "La descripcion es requerida"),
    type: ActivityTypeSchema,
    roomId: z.string().uuid("La sala es requerida"),
    startTime: z.string().min(1, "La hora de inicio es requerida"),
    endTime: z.string().min(1, "La hora de fin es requerida"),
    leaders: z.array(z.string().uuid()),
    workshopCapacity: z
      .number()
      .int()
      .positive("La capacidad debe ser mayor a 0")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === "TALLER" && data.workshopCapacity === undefined) {
        return false;
      }
      return true;
    },
    {
      message: "La capacidad del taller es requerida",
      path: ["workshopCapacity"],
    },
  )
  .refine(
    (data) => {
      if (data.startTime.length === 0 || data.endTime.length === 0) return true;
      return data.startTime < data.endTime;
    },
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["endTime"],
    },
  );

export const UpdateActivitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  roomId: z.string().uuid().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  leaders: z.array(z.string().uuid()).optional(),
  workshopCapacity: z.number().int().positive().optional(),
});

export type ActivityData = z.infer<typeof ActivitySchema>;
export type ActivityListData = z.infer<typeof ActivityListSchema>;
export type CreateActivityData = z.infer<typeof CreateActivitySchema>;
export type UpdateActivityData = z.infer<typeof UpdateActivitySchema>;
