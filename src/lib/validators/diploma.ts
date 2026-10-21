import { z } from "zod";

export const DiplomaSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  congressId: z.string().uuid(),
  type: z.enum(["PARTICIPATION", "LEADERSHIP"]),
  activityId: z.string().uuid().nullable(),
  issuedAt: z.string(),
  congressName: z.string(),
  activityName: z.string().nullable(),
  available: z.boolean(),
});

export const DiplomaListSchema = z.object({
  items: z.array(DiplomaSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const DiplomaPrintDataSchema = z.object({
  diplomaId: z.string().uuid(),
  userId: z.string().uuid(),
  userFullName: z.string(),
  congressId: z.string().uuid(),
  congressName: z.string(),
  activityId: z.string().uuid().nullable(),
  activityName: z.string().nullable(),
  type: z.enum(["PARTICIPATION", "LEADERSHIP"]),
  issuedAt: z.string(),
});

export type DiplomaData = z.infer<typeof DiplomaSchema>;
export type DiplomaListData = z.infer<typeof DiplomaListSchema>;
export type DiplomaPrintData = z.infer<typeof DiplomaPrintDataSchema>;
