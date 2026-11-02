import type { z } from "zod";
import type * as C from "@/types/commerce";
import type * as R from "@/types/rentals";
import type * as M from "@/types/maintenance";
import type { AnalyticsReport } from "@/types/analytics";
import type * as CV from "@/lib/validators/commerce";
import type * as RV from "@/lib/validators/rentals";
import type * as MV from "@/lib/validators/maintenance";
import type * as AV from "@/lib/validators/analytics";
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type RemainingContractChecks = [
  Assert<Equal<C.TripSeatMap, z.output<typeof CV.SeatMapSchema>>>,
  Assert<Equal<C.SeatHold, z.output<typeof CV.HoldSchema>>>,
  Assert<Equal<C.TicketPayment, z.output<typeof CV.TicketPaymentSchema>>>,
  Assert<Equal<C.PaymentTicket, z.output<typeof CV.PaymentTicketSchema>>>,
  Assert<Equal<C.CommerceInvoice, z.output<typeof CV.CommerceInvoiceSchema>>>,
  Assert<Equal<C.InvoiceTicket, z.output<typeof CV.InvoiceTicketSchema>>>,
  Assert<Equal<C.CancellationPreview, z.output<typeof CV.CancellationPreviewSchema>>>,
  Assert<Equal<C.CommerceReceipt, z.output<typeof CV.ReceiptSchema>>>,
  Assert<Equal<C.PosCustomer, z.output<typeof CV.PosCustomerSchema>>>,
  Assert<Equal<C.CustomerSuggestion, z.output<typeof CV.CustomerSuggestionSchema>>>,
  Assert<Equal<C.CashContext, z.output<typeof CV.CashContextSchema>>>,
  Assert<Equal<C.CashAccount, z.output<typeof CV.CashAccountSchema>>>,
  Assert<Equal<C.CashHistory, z.output<typeof CV.CashHistorySchema>>>,
  Assert<Equal<C.CommerceWallet, z.output<typeof CV.CommerceWalletSchema>>>,
  Assert<Equal<C.WalletTransaction, z.output<typeof CV.WalletTransactionSchema>>>,
  Assert<Equal<C.WalletOverview, z.output<typeof CV.WalletOverviewSchema>>>,
  Assert<Equal<C.WalletRecharge, z.output<typeof CV.WalletRechargeSchema>>>,
  Assert<Equal<C.RefundRecord, z.output<typeof CV.RefundSchema>>>,
  Assert<Equal<C.TicketCancellation, z.output<typeof CV.TicketCancellationSchema>>>,
  Assert<Equal<C.CancellationPolicy, z.output<typeof CV.CancellationPolicySchema>>>,
  Assert<Equal<C.SeatRestriction, z.output<typeof CV.RestrictionResultSchema>>>,
  Assert<Equal<R.RentalQuoteInput, z.output<typeof RV.CheckedRentalQuoteInputSchema>>>,
  Assert<Equal<R.RentalQuote, z.output<typeof RV.RentalQuoteSchema>>>,
  Assert<Equal<R.RentalContract, z.output<typeof RV.RentalContractSchema>>>,
  Assert<Equal<R.RentalLeg, z.output<typeof RV.RentalLegSchema>>>,
  Assert<Equal<R.RentalPolicy, z.output<typeof RV.RentalPolicySchema>>>,
  Assert<Equal<R.RentalPayment, z.output<typeof RV.RentalPaymentSchema>>>,
  Assert<Equal<R.RentalContext, z.output<typeof RV.RentalContextSchema>>>,
  Assert<Equal<R.RentalResources, z.output<typeof RV.RentalResourcesSchema>>>,
  Assert<Equal<M.ExpenseCategory, z.output<typeof MV.CategorySchema>>>,
  Assert<Equal<M.WorkshopLine, z.output<typeof MV.WorkshopLineSchema>>>,
  Assert<Equal<M.WorkshopInput, z.output<typeof MV.WorkshopInputSchema>>>,
  Assert<Equal<M.WorkshopService, z.output<typeof MV.WorkshopServiceSchema>>>,
  Assert<Equal<AnalyticsReport, z.output<typeof AV.AnalyticsReportSchema>>>,
];
