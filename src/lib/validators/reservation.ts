import { z } from "zod";

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  userId: z.string().uuid(),
  reservedAt: z.string(),
});

export const ReservationListSchema = z.object({
  items: z.array(ReservationSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type ReservationData = z.infer<typeof ReservationSchema>;
export type ReservationListData = z.infer<typeof ReservationListSchema>;
