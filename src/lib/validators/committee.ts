import { z } from "zod";

export const CommitteeMemberSchema = z.object({
  congressId: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  addedAt: z.string(),
});

export const CommitteeMemberListSchema = z.object({
  items: z.array(CommitteeMemberSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const AddCommitteeMemberSchema = z.object({
  userId: z.string().uuid("El usuario es requerido"),
});

export type CommitteeMemberData = z.infer<typeof CommitteeMemberSchema>;
export type CommitteeMemberListData = z.infer<typeof CommitteeMemberListSchema>;
export type AddCommitteeMemberData = z.infer<typeof AddCommitteeMemberSchema>;
