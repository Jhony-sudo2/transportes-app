import { z } from "zod";

const ProposalTypeSchema = z.enum(["PONENCIA", "TALLER"]);
const ProposalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const ProposalSchema = z.object({
  id: z.string().uuid(),
  callId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  type: ProposalTypeSchema,
  status: ProposalStatusSchema,
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ProposalListSchema = z.object({
  items: z.array(ProposalSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const CreateProposalSchema = z.object({
  title: z.string().min(1, "El titulo es requerido"),
  description: z.string().min(1, "La descripcion es requerida"),
  type: ProposalTypeSchema,
});

export type ProposalData = z.infer<typeof ProposalSchema>;
export type ProposalListData = z.infer<typeof ProposalListSchema>;
export type CreateProposalData = z.infer<typeof CreateProposalSchema>;
