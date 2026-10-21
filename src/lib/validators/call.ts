import { z } from "zod";

export const CallSchema = z.object({
  id: z.string().uuid(),
  congressId: z.string().uuid(),
  status: z.enum(["OPEN", "CLOSED"]),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
});

export const CallListSchema = z.object({
  items: z.array(CallSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type CallData = z.infer<typeof CallSchema>;
export type CallListData = z.infer<typeof CallListSchema>;
