import { z } from "zod";

const TransactionTypeSchema = z.enum(["TOP_UP", "PAYMENT"]);

export const WalletBalanceSchema = z.object({
  userId: z.string().uuid(),
  balance: z.number().nonnegative(),
});

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  walletUserId: z.string().uuid(),
  type: TransactionTypeSchema,
  amount: z.number(),
  transactionDate: z.string(),
  referencePaymentId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const TransactionListSchema = z.object({
  items: z.array(TransactionSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const TopUpSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  paymentDate: z.string().min(1, "La fecha de pago es requerida"),
});

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  congressId: z.string().uuid(),
  institutionId: z.string().uuid(),
  congressNameSnapshot: z.string(),
  institutionNameSnapshot: z.string(),
  commissionPercentSnapshot: z.number().nonnegative(),
  amount: z.number().positive(),
  commissionAmount: z.number().nonnegative(),
  netAmount: z.number().nonnegative(),
  paymentDate: z.string(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});

export type WalletBalanceData = z.infer<typeof WalletBalanceSchema>;
export type TransactionData = z.infer<typeof TransactionSchema>;
export type TransactionListData = z.infer<typeof TransactionListSchema>;
export type TopUpData = z.infer<typeof TopUpSchema>;
export type PaymentData = z.infer<typeof PaymentSchema>;
