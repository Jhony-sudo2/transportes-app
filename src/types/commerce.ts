export interface SeatPosition {
  row: number;
  column: number;
}
export interface SeatCell extends SeatPosition {
  state: "AVAILABLE" | "HELD" | "SOLD" | "BLOCKED";
  reason?: string | null | undefined;
}
export interface TripSeatMap {
  tripId: number;
  busId: number;
  seatRows: number;
  seatColumns: number;
  capacity: number;
  seats: SeatCell[];
}
export interface SeatHold {
  holdId: string;
  expiresAt: string;
  totalAmount: number;
}
export interface PaymentTicket {
  ticketId: number;
  tripId: number;
  seatRow: number;
  seatColumn: number;
}
export interface TicketPayment {
  invoiceId: number;
  totalAmount: number;
  tickets: PaymentTicket[];
  customerId?: number | undefined;
  sellerUserId?: number | undefined;
  sourceBranchId?: number | undefined;
  revenueBranchId?: number | undefined;
  paymentDate?: string | undefined;
  contactEmailStatus?: string | undefined;
}
export interface CommerceInvoice {
  invoiceId: number;
  customerId: number;
  customerNit: string;
  customerName: string;
  totalAmount: number;
  paymentDate: string;
  channel: "WEB" | "IN_PERSON";
  sourceBranchId: number | null;
  revenueBranchId: number;
  sellerUserId: number | null;
  state: "PAID" | "CANCELLED";
  typeInvoice: "TICKET_PAYMENT" | "RENTAL_PAYMENT";
  contactEmailStatus: string;
  refundedAmount?: number | null | undefined;
  rentalId?: number | null | undefined;
  quoteId?: number | null | undefined;
}
export interface InvoiceTicket extends PaymentTicket {
  invoiceId: number;
  amount: number;
  cancelled: boolean;
  cancellationPreview?: CancellationPreview | undefined;
}
export interface CancellationPreview {
  eligible: boolean;
  amount: number;
  appliedPercent: number;
  reason?: string | null | undefined;
}
export interface CommerceReceipt {
  invoice: CommerceInvoice;
  tickets: InvoiceTicket[];
}
export interface PosCustomer {
  customerId: number;
  nit: string;
  fullName: string;
  hasUser: boolean;
  email?: string | null | undefined;
  address?: string | null | undefined;
  phone?: string | null | undefined;
}
export interface CustomerSuggestion {
  customerId: number;
  nit: string;
  fullName: string;
  hasUser: boolean;
}
export interface CashContext {
  userId: number;
  branchId: number;
  branchName: string;
  canManageCapital: boolean;
}
export interface CashAccount {
  branchId: number;
  balance: number;
  initializedAt: string | null;
}
export interface CashMovement {
  kind: "OPENING" | "TICKET_SALE" | "RENTAL_SALE" | "CASH_REFUND" | "CAPITAL_IN" | "CAPITAL_OUT";
  amount: number;
  balanceAfter: number;
  createdAt: string;
  reason?: string | null | undefined;
}
export interface CashHistory {
  items: CashMovement[];
  balance: number;
}
export interface CommerceWallet {
  balance: number;
  active: boolean;
}
export interface WalletTransaction {
  id: number;
  transactionType: "USER_RECHARGE" | "TICKET_PAYMENT" | "RENTAL_PAYMENT" | "REFUND";
  createdAt: string;
  amount: number;
  balanceAfter?: number | undefined;
  description?: string | null | undefined;
}
export interface WalletOverview {
  wallet: CommerceWallet;
  transactions: WalletTransaction[];
}
export interface WalletRecharge {
  transactionId: number;
  balanceAfter: number;
}
export interface RefundRecord {
  refundId: number;
  invoiceId: number;
  ticketId: number | null;
  rentalId: number | null;
  refundCode: string;
  cause: "VOLUNTARY" | "BUSINESS_INCIDENT" | "TRIP_CANCELLED" | "RENTAL_CANCELLED";
  appliedPercent: number;
  amount: number;
  status: "PENDING" | "COMPLETED";
  method: "WALLET" | "CASH" | null;
  settledAt: string | null;
  paidBranchId?: number | null | undefined;
  processedByUserId?: number | null | undefined;
  reason?: string | null | undefined;
}
export interface CancellationPolicy {
  cutoffMinutes: number;
  voluntaryRefundPercent: number;
}
export interface TicketCancellation {
  ticketId: number;
  refundId: number;
  amount: number;
  refundStatus: "PENDING";
}
export interface SeatRestriction {
  restrictionId: number;
  isActive: boolean;
}
