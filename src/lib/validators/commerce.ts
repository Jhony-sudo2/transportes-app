import { z } from "zod";
import type * as C from "@/types/commerce";
import { ManagedBranchIdSchema as id } from "./branch-context";
import {
  MoneyInputSchema as money,
  BusinessInstantSchema as instant,
  CivilDateSchema as date,
} from "./journey";
export const OperationKeySchema = z.string().uuid("La operación necesita una referencia válida");
export const SeatPositionSchema = z.object({ row: id.max(30), column: id.max(6) }).strict();
export const SeatMapSchema = z
  .object({
    tripId: id,
    seatRows: id.max(30),
    seatColumns: id.max(6),
    seatLayoutRevision: z.number().int().nonnegative().safe(),
    seats: z
      .array(
        SeatPositionSchema.extend({
          state: z.enum(["AVAILABLE", "HELD", "SOLD", "BLOCKED"]),
          reason: z.string().nullish(),
        }).strip(),
      )
      .max(180),
  })
  .superRefine((map, ctx) => {
    if (
      new Set(map.seats.map((s) => `${s.row}:${s.column}`)).size !== map.seats.length ||
      map.seats.some((s) => s.row > map.seatRows || s.column > map.seatColumns)
    )
      ctx.addIssue({ code: "custom", message: "Distribución de asientos incompatible" });
  }) satisfies z.ZodType<C.TripSeatMap, z.ZodTypeDef, unknown>;
export const SeatMapResponseSchema = z
  .object({
    tripId: id,
    seatRows: id.max(30),
    seatColumns: id.max(6),
    seatLayoutRevision: z.number().int().nonnegative().safe(),
    seats: z
      .array(
        SeatPositionSchema.extend({
          status: z.enum(["AVAILABLE", "HELD", "SOLD", "BLOCKED"]),
          reason: z.string().nullish(),
        }).strip(),
      )
      .max(180),
  })
  .transform(({ seats, ...map }) => ({
    ...map,
    seats: seats.map(({ status, ...seat }) => ({ ...seat, state: status })),
  }))
  .pipe(SeatMapSchema);
export const HoldInputSchema = z
  .object({
    seats: z
      .array(SeatPositionSchema)
      .min(1)
      .max(180)
      .refine(
        (seats) => new Set(seats.map((s) => `${s.row}:${s.column}`)).size === seats.length,
        "No repitas asientos",
      ),
  })
  .strict();
export const HoldSchema = z.object({
  holdId: z.string().min(1).max(128),
  expiresAt: instant,
  totalAmount: money,
}) satisfies z.ZodType<C.SeatHold, z.ZodTypeDef, unknown>;
export const TicketPaymentInputSchema = z
  .object({ holdId: HoldSchema.shape.holdId, paymentDate: date })
  .strict();
export const CounterPaymentInputSchema = TicketPaymentInputSchema.extend({
  nit: z.string().trim().min(1).max(50),
  contactEmail: z.string().trim().email().max(254).optional(),
}).strict();
export const PaymentTicketSchema = z.object({
  ticketId: id,
  tripId: id,
  seatRow: id,
  seatColumn: id,
});
export const TicketPaymentSchema = z.object({
  invoiceId: id,
  totalAmount: money,
  tickets: z.array(PaymentTicketSchema).min(1),
  customerId: id.optional(),
  sellerUserId: id.optional(),
  sourceBranchId: id.optional(),
  revenueBranchId: id.optional(),
  paymentDate: date.optional(),
  contactEmailStatus: z.string().optional(),
}) satisfies z.ZodType<C.TicketPayment, z.ZodTypeDef, unknown>;
export const CounterPaymentSchema = TicketPaymentSchema.extend({
  customerId: id,
  sellerUserId: id,
  sourceBranchId: id,
  revenueBranchId: id,
  paymentDate: date,
  contactEmailStatus: z.string(),
});
export const CommerceInvoiceSchema = z
  .object({
    invoiceId: id,
    customerId: id,
    customerNit: z.string().min(1),
    customerName: z.string().min(1),
    totalAmount: money,
    paymentDate: date,
    channel: z.enum(["WEB", "IN_PERSON"]),
    sourceBranchId: id.nullable(),
    revenueBranchId: id,
    sellerUserId: id.nullable(),
    state: z.enum(["PAID", "CANCELLED"]).optional(),
    typeInvoice: z.enum(["TICKET_PAYMENT", "RENTAL_PAYMENT"]).optional(),
    contactEmailStatus: z.string().optional(),
    refundedAmount: money.nullish(),
    rentalId: id.nullish(),
    quoteId: id.nullish(),
  })
  .superRefine((v, c) => {
    if (
      (v.channel === "WEB" && (v.sourceBranchId !== null || v.sellerUserId !== null)) ||
      (v.channel === "IN_PERSON" && (!v.sourceBranchId || !v.sellerUserId))
    )
      c.addIssue({ code: "custom", message: "Canal y sucursal de compra incompatibles" });
  }) satisfies z.ZodType<C.CommerceInvoice, z.ZodTypeDef, unknown>;
export const CancellationPreviewSchema = z.discriminatedUnion("eligible", [
  z.object({
    eligible: z.literal(true),
    amount: money,
    appliedPercent: z.number().positive().max(100),
    reason: z.string().nullish(),
  }),
  z.object({ eligible: z.literal(false), reason: z.string().min(1) }).strict(),
]);
export const InvoiceTicketSchema = PaymentTicketSchema.extend({
  invoiceId: id,
  amount: money,
  cancelled: z.boolean(),
  cancellationPreview: CancellationPreviewSchema.optional(),
});
export const ReceiptSchema = z
  .object({ invoice: CommerceInvoiceSchema, tickets: z.array(InvoiceTicketSchema) })
  .refine(
    (r) => r.tickets.every((t) => t.invoiceId === r.invoice.invoiceId),
    "Los boletos no corresponden a la factura",
  ) satisfies z.ZodType<C.CommerceReceipt, z.ZodTypeDef, unknown>;
// Commerce entrega la factura y sus boletos en un único PurchaseResponse.
export const PurchaseResponseSchema = z
  .object({
    invoiceId: id,
    customerId: id,
    customerNit: z.string().min(1),
    customerName: z.string().min(1),
    totalAmount: money,
    paymentDate: date,
    channel: z.enum(["WEB", "IN_PERSON"]),
    sourceBranchId: id.nullable(),
    revenueBranchId: id,
    sellerUserId: id.nullish(),
    contactEmailStatus: z.string().optional(),
    state: z.enum(["PAID", "CANCELLED"]).optional(),
    typeInvoice: z.enum(["TICKET_PAYMENT", "RENTAL_PAYMENT"]).optional(),
    refundedAmount: money.nullish(),
    tickets: z.array(
      PaymentTicketSchema.extend({
        amount: money,
        state: z.enum(["PAID", "CANCELLED"]),
        cancellationPreview: CancellationPreviewSchema.optional(),
      }),
    ),
  })
  .transform(({ tickets, sellerUserId, ...invoice }) => ({
    invoice: { ...invoice, sellerUserId: sellerUserId ?? null },
    tickets: tickets.map(({ state, ...ticket }) => ({
      ...ticket,
      invoiceId: invoice.invoiceId,
      cancelled: state === "CANCELLED",
    })),
  }))
  .pipe(ReceiptSchema);
export const CustomerSuggestionSchema = z.object({
  customerId: id,
  nit: z.string().min(1),
  fullName: z.string().min(1),
  hasUser: z.boolean(),
});
export const PosCustomerSchema = CustomerSuggestionSchema.extend({
  email: z.string().email().nullish(),
  address: z.string().nullish(),
  phone: z.string().nullish(),
}) satisfies z.ZodType<C.PosCustomer, z.ZodTypeDef, unknown>;
export const CounterCustomerInputSchema = z
  .object({
    nit: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .refine((v) => v.toUpperCase() !== "CF", "CF no requiere crear una persona"),
    fullName: z.string().trim().min(1).max(255),
    address: z.string().trim().max(255).optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().email().max(254).optional(),
  })
  .strict();
export const ContactInputSchema = CounterCustomerInputSchema.omit({ nit: true }).strict();
export const CashContextSchema = z.object({
  userId: id,
  branchId: id,
  branchName: z.string(),
  canManageCapital: z.boolean(),
}) satisfies z.ZodType<C.CashContext, z.ZodTypeDef, unknown>;
export const CashAccountSchema = z.object({
  branchId: id,
  balance: money,
  initializedAt: instant.nullable(),
}) satisfies z.ZodType<C.CashAccount, z.ZodTypeDef, unknown>;
export const CashHistorySchema = z.object({
  balance: money,
  items: z.array(
    z.object({
      kind: z.enum([
        "OPENING",
        "TICKET_SALE",
        "RENTAL_SALE",
        "CASH_REFUND",
        "CAPITAL_IN",
        "CAPITAL_OUT",
      ]),
      amount: money.refine((n) => n > 0),
      balanceAfter: money,
      createdAt: instant,
      reason: z.string().nullish(),
    }),
  ),
}) satisfies z.ZodType<C.CashHistory, z.ZodTypeDef, unknown>;
export const CashOpeningSchema = z.object({ amount: money }).strict();
export const CapitalInputSchema = z
  .object({
    type: z.enum(["IN", "OUT"]),
    amount: money.refine((n) => n > 0, "El monto debe ser positivo"),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const CommerceWalletSchema = z.object({
  balance: money,
  active: z.boolean(),
}) satisfies z.ZodType<C.CommerceWallet, z.ZodTypeDef, unknown>;
export const WalletTransactionSchema = z.object({
  id,
  transactionType: z.enum(["USER_RECHARGE", "TICKET_PAYMENT", "RENTAL_PAYMENT", "REFUND"]),
  createdAt: instant,
  amount: money,
  balanceAfter: money.optional(),
  description: z.string().nullish(),
}) satisfies z.ZodType<C.WalletTransaction, z.ZodTypeDef, unknown>;
export const WalletTransactionResponseSchema = WalletTransactionSchema.omit({ id: true })
  .extend({ transactionId: id })
  .transform(({ transactionId, ...transaction }) => ({ id: transactionId, ...transaction }));
export const WalletOverviewSchema = z.object({
  wallet: CommerceWalletSchema,
  transactions: WalletTransactionSchema.array(),
}) satisfies z.ZodType<C.WalletOverview, z.ZodTypeDef, unknown>;
export const RechargeInputSchema = z
  .object({
    amount: money.refine((n) => n > 0, "El monto debe ser positivo"),
    paymentDate: date,
  })
  .strict();
export const WalletRechargeSchema = z.object({
  transactionId: id,
  balanceAfter: money,
}) satisfies z.ZodType<C.WalletRecharge, z.ZodTypeDef, unknown>;
export const RefundSchema = z
  .object({
    refundId: id,
    invoiceId: id.optional(),
    ticketId: id.nullish().transform((v) => v ?? null),
    rentalId: id.nullish().transform((v) => v ?? null),
    refundCode: z.string().min(1).max(48),
    cause: z.enum(["VOLUNTARY", "BUSINESS_INCIDENT", "TRIP_CANCELLED", "RENTAL_CANCELLED"]),
    appliedPercent: z.number().positive().max(100),
    amount: money.refine((n) => n > 0),
    status: z.enum(["PENDING", "COMPLETED"]),
    method: z
      .enum(["CASH", "WALLET"])
      .nullish()
      .transform((v) => v ?? null),
    settledAt: instant.nullish().transform((v) => v ?? null),
    paidBranchId: id.nullish(),
    processedByUserId: id.nullish(),
    reason: z.string().nullish(),
  })
  .superRefine((r, c) => {
    if (
      (r.ticketId === null) === (r.rentalId === null) ||
      (r.status === "PENDING" && (r.method !== null || r.settledAt !== null)) ||
      (r.status === "COMPLETED" &&
        (!r.method || !r.settledAt || (r.method === "CASH" && !r.paidBranchId)))
    )
      c.addIssue({ code: "custom", message: "Estado de reembolso incompatible" });
  }) satisfies z.ZodType<C.RefundRecord, z.ZodTypeDef, unknown>;
export const RefundClaimSchema = RefundSchema.and(
  z.object({
    tripId: id.nullish(),
    seatRow: id.nullish(),
    seatColumn: id.nullish(),
    holderName: z.string().min(1),
    operationBranchId: id,
    cashSettleable: z.boolean(),
    requiredChecks: z.array(z.string().min(1)).max(20),
  }),
).superRefine((claim, ctx) => {
  if (claim.cashSettleable && claim.status !== "PENDING")
    ctx.addIssue({ code: "custom", message: "El reembolso liquidado no admite otro pago" });
}) satisfies z.ZodType<C.RefundClaim, z.ZodTypeDef, unknown>;
export const CancellationPolicySchema = z
  .object({
    cutoffMinutes: z.number().int().nonnegative().max(2147483647),
    voluntaryRefundPercent: z.number().positive().max(100),
  })
  .strict() satisfies z.ZodType<C.CancellationPolicy, z.ZodTypeDef, unknown>;
export const TicketCancellationSchema = z.object({
  ticketId: id,
  refundId: id,
  amount: money.refine((n) => n > 0),
  refundStatus: z.literal("PENDING"),
}) satisfies z.ZodType<C.TicketCancellation, z.ZodTypeDef, unknown>;
export const TicketCancelInputSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();
export const CashSettleInputSchema = z.object({ delivered: z.literal(true) }).strict();
export const RestrictionInputSchema = z
  .object({
    scopeType: z.enum(["TRIP", "BUS"]),
    scopeId: id,
    seatRow: id.max(30),
    seatColumn: id.max(6),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const RestrictionResultSchema = z.object({
  restrictionId: id,
  isActive: z.boolean(),
}) satisfies z.ZodType<C.SeatRestriction, z.ZodTypeDef, unknown>;
export const RestrictionTripSchema = z.object({
  tripId: id,
  departureAt: instant,
}) satisfies z.ZodType<C.RestrictionTrip, z.ZodTypeDef, unknown>;
export const ReassignInputSchema = z
  .object({ seatRow: id.max(30), seatColumn: id.max(6) })
  .strict();
export const ReassignResultSchema = z.object({ ticketId: id, seatRow: id, seatColumn: id });
export const DateRangeSchema = z
  .object({ dateFrom: date.optional(), dateTo: date.optional() })
  .strict()
  .refine(
    (v) => !v.dateFrom || !v.dateTo || v.dateFrom <= v.dateTo,
    "La fecha inicial no puede ser posterior a la final",
  );
