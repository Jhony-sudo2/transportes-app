// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-wallet.ts wrapper.

import type {
  WalletBalanceData,
  TransactionData,
  PaymentData,
} from "@/lib/validators/wallet";
import { MOCK_CONGRESS_1_ID } from "./congresses";
import { MOCK_INSTITUTION_1_ID } from "./institutions";
import { MOCK_PAYMENT_1_ID } from "./enrollments";
import { MOCK_PARTICIPANT_4_ID, MOCK_PARTICIPANT_ID } from "./users";

export const MOCK_WALLETS: WalletBalanceData[] = [
  {
    userId: MOCK_PARTICIPANT_ID,
    balance: 350,
  },
  {
    userId: MOCK_PARTICIPANT_4_ID,
    balance: 0,
  },
];

export const MOCK_TRANSACTIONS: TransactionData[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    walletUserId: MOCK_PARTICIPANT_ID,
    type: "TOP_UP",
    amount: 500,
    transactionDate: "2026-06-10",
    referencePaymentId: null,
    createdAt: "2026-06-10T09:00:00Z",
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    walletUserId: MOCK_PARTICIPANT_ID,
    type: "PAYMENT",
    amount: -150,
    transactionDate: "2026-06-15",
    referencePaymentId: MOCK_PAYMENT_1_ID,
    createdAt: "2026-06-15T10:00:00Z",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    walletUserId: MOCK_PARTICIPANT_ID,
    type: "TOP_UP",
    amount: 200,
    transactionDate: "2026-06-20",
    referencePaymentId: null,
    createdAt: "2026-06-20T14:00:00Z",
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    walletUserId: MOCK_PARTICIPANT_ID,
    type: "TOP_UP",
    amount: 100,
    transactionDate: "2026-07-01",
    referencePaymentId: null,
    createdAt: "2026-07-01T08:00:00Z",
  },
];

export const MOCK_PAYMENTS: PaymentData[] = [
  {
    id: MOCK_PAYMENT_1_ID,
    userId: MOCK_PARTICIPANT_ID,
    congressId: MOCK_CONGRESS_1_ID,
    institutionId: MOCK_INSTITUTION_1_ID,
    congressNameSnapshot: "Congreso de Ingenieria 2026",
    institutionNameSnapshot: "Universidad de San Carlos de Guatemala",
    commissionPercentSnapshot: 10,
    amount: 150,
    commissionAmount: 15,
    netAmount: 135,
    paymentDate: "2026-06-15",
    idempotencyKey: "idem-00000000-0000-0000-0000-000000000001",
    createdAt: "2026-06-15T10:00:00Z",
  },
];
