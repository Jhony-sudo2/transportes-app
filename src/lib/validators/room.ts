import { z } from "zod";

export const RoomSchema = z.object({
  id: z.string().uuid(),
  congressId: z.string().uuid(),
  name: z.string(),
  capacity: z.number().int().positive().nullable(),
  location: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RoomListSchema = z.object({
  items: z.array(RoomSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const CreateRoomSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  capacity: z.number().int().positive("La capacidad debe ser un numero positivo").optional(),
  location: z.string().optional(),
});

export const UpdateRoomSchema = CreateRoomSchema.partial();

export type RoomData = z.infer<typeof RoomSchema>;
export type RoomListData = z.infer<typeof RoomListSchema>;
export type CreateRoomData = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomData = z.infer<typeof UpdateRoomSchema>;
