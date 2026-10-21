import { z } from "zod";

export const EnrollmentSchema = z.object({
  id: z.string().uuid(),
  congressId: z.string().uuid(),
  userId: z.string().uuid(),
  paymentId: z.string().uuid(),
  enrolledAt: z.string(),
  paymentDate: z.string(),
  congressName: z.string().optional(),
});

export const EnrollmentListSchema = z.object({
  items: z.array(EnrollmentSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const CreateEnrollmentSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "paymentDate must be YYYY-MM-DD"),
});

export type EnrollmentData = z.infer<typeof EnrollmentSchema>;
export type EnrollmentListData = z.infer<typeof EnrollmentListSchema>;
export type CreateEnrollmentData = z.infer<typeof CreateEnrollmentSchema>;
