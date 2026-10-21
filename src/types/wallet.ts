import type { WalletBalanceData, TransactionData, PaymentData } from "@/lib/validators/wallet";

export type TransactionType = "TOP_UP" | "PAYMENT";
export type Wallet = WalletBalanceData;
export type Transaction = TransactionData;
export type Payment = PaymentData;
