import { z } from "zod";
export const CommerceIdSchema = z.number().int().positive().safe();
const money = z.number().finite().nonnegative();
const dateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/, "Fecha inválida");
export const CustomerWalletSchema = z.object({ id: CommerceIdSchema, amount: money });
export const CustomerTransactionSchema = z.object({
  id: CommerceIdSchema,
  transactionType: z.enum(["USER_RECHARGE", "TICKET_PAYMENT", "RENTAL_PAYMENT", "REFUND"]),
  createdAt: dateTime,
  amount: money,
  description: z.string().nullish(),
});
export const CustomerTransactionsSchema = z.array(CustomerTransactionSchema);
export const CustomerWalletOverviewSchema = z.object({
  wallet: CustomerWalletSchema,
  transactions: CustomerTransactionsSchema,
});
export const CustomerRechargeSchema = z
  .object({
    amount: z
      .number({ invalid_type_error: "Ingresa un monto válido" })
      .finite()
      .positive("El monto debe ser mayor que cero")
      .max(Number.MAX_SAFE_INTEGER / 100, "El monto es demasiado grande")
      .refine((value) => Number(value.toFixed(2)) === value, "Usa como máximo dos decimales"),
  })
  .strict();
export const CustomerInvoiceSchema = z.object({
  id: CommerceIdSchema,
  branchId: CommerceIdSchema,
  userId: CommerceIdSchema.nullable(),
  totalAmount: money,
  paymentDate: dateTime,
  chanel: z.string().nullish(),
  sellerUserId: CommerceIdSchema.nullish(),
  typeInvoice: z.string(),
  customerNit: z.string().nullish(),
  state: z.string(),
});
export const CustomerInvoicesSchema = z.array(CustomerInvoiceSchema);
export const CustomerTicketSchema = z.object({
  id: CommerceIdSchema,
  invoiceId: CommerceIdSchema,
  amount: money,
  position: z.object({ row: CommerceIdSchema, column: CommerceIdSchema }),
  paymentDate: dateTime,
});
export const CustomerInvoiceDetailSchema = z.object({
  invoice: CustomerInvoiceSchema,
  tickets: z.array(CustomerTicketSchema),
});
export type CustomerWalletOverview = z.infer<typeof CustomerWalletOverviewSchema>;
export type CustomerTransaction = z.infer<typeof CustomerTransactionSchema>;
export type CustomerInvoice = z.infer<typeof CustomerInvoiceSchema>;
export type CustomerTicket = z.infer<typeof CustomerTicketSchema>;
