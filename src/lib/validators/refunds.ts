import { z } from "zod";
import {
  CommerceIdSchema,
  CustomerInvoiceSchema,
  CustomerInvoicesSchema,
  CustomerTicketSchema,
} from "./customer-commerce";

export const RefundBranchSchema = z.object({
  branchId: CommerceIdSchema,
  branchName: z.string().trim().min(1),
});
export const RefundListSchema = CustomerInvoicesSchema;
export const RefundDetailSchema = z.object({
  invoice: CustomerInvoiceSchema,
  branchName: z.string().trim().min(1),
  tickets: CustomerTicketSchema.array(),
});
export const RefundRequestSchema = z.object({ invoiceId: CommerceIdSchema }).strict();
export type RefundDetail = z.infer<typeof RefundDetailSchema>;

export function parseInvoiceId(value: string) {
  return /^[1-9]\d*$/.test(value) ? CommerceIdSchema.safeParse(Number(value)) : null;
}
