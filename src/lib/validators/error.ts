import { z } from "zod";

const ErrorCodeSchema = z.enum([
  "validation.failed",
  "auth.invalid_credentials",
  "auth.token_expired",
  "auth.token_invalid",
  "auth.forbidden",
  "resource.not_found",
  "resource.conflict",
  "domain.invariant_violated",
  "wallet.insufficient_funds",
  "committee.not_member",
  "idempotency.replay",
  "system.internal_error",
]);

export const ProblemDetailSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().int(),
  detail: z.string(),
  code: ErrorCodeSchema,
  instance: z.string().optional(),
});

export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;
