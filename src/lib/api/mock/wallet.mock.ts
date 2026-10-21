// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-wallet.ts wrapper.

import type {
  WalletBalanceData,
  TransactionListData,
  TopUpData,
  PaymentData,
} from "@/lib/validators/wallet";
import type { SystemConfigData } from "@/lib/validators/system-config";
import {
  MOCK_WALLETS,
  MOCK_TRANSACTIONS,
  MOCK_PAYMENTS,
} from "./data/wallet";
import { MOCK_PARTICIPANT_ID } from "./data/users";

const MOCK_DELAY = 200;

async function delay(): Promise<void> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
}

// --- Wallet ---

export async function getWalletBalance(_token: string): Promise<WalletBalanceData> {
  await delay();
  const wallet = MOCK_WALLETS.find((w) => w.userId === MOCK_PARTICIPANT_ID);
  if (wallet === undefined) throw new Error("resource.not_found");
  return wallet;
}

export async function getWalletTransactions(
  _token: string,
  params: URLSearchParams,
): Promise<TransactionListData> {
  await delay();
  let items = MOCK_TRANSACTIONS.filter((t) => t.walletUserId === MOCK_PARTICIPANT_ID);
  const type = params.get("type");
  if (type !== null) {
    items = items.filter((t) => t.type === type);
  }
  const dateFrom = params.get("dateFrom");
  if (dateFrom !== null) {
    items = items.filter((t) => t.transactionDate >= dateFrom);
  }
  const dateTo = params.get("dateTo");
  if (dateTo !== null) {
    items = items.filter((t) => t.transactionDate <= dateTo);
  }
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function topUpWallet(
  data: TopUpData,
  _token: string,
): Promise<WalletBalanceData> {
  await delay();
  const wallet = MOCK_WALLETS.find((w) => w.userId === MOCK_PARTICIPANT_ID);
  if (wallet === undefined) throw new Error("resource.not_found");
  return { ...wallet, balance: wallet.balance + data.amount };
}

// --- Payments ---

export async function getPayment(id: string, _token: string): Promise<PaymentData> {
  await delay();
  const payment = MOCK_PAYMENTS.find((p) => p.id === id);
  if (payment === undefined) throw new Error("resource.not_found");
  return payment;
}

export async function listPayments(
  _token: string,
  _params: URLSearchParams,
): Promise<{ items: PaymentData[]; totalItems: number; totalPages: number }> {
  await delay();
  return {
    items: MOCK_PAYMENTS,
    totalItems: MOCK_PAYMENTS.length,
    totalPages: 1,
  };
}

// --- System Config ---

const MOCK_SYSTEM_CONFIG: SystemConfigData = {
  commissionPercent: 10,
  updatedBy: "00000000-0000-0000-0000-000000000003",
  updatedAt: "2026-01-01T00:00:00Z",
};

export async function getSystemConfig(_token: string): Promise<SystemConfigData> {
  await delay();
  return MOCK_SYSTEM_CONFIG;
}

export async function updateSystemConfig(
  commissionPercent: number,
  _token: string,
): Promise<SystemConfigData> {
  await delay();
  return { ...MOCK_SYSTEM_CONFIG, commissionPercent, updatedAt: new Date().toISOString() };
}

export async function registerPayment(
  _data: unknown,
  _token: string,
  _idempotencyKey: string,
): Promise<PaymentData> {
  await delay();
  const payment = MOCK_PAYMENTS[0];
  if (payment === undefined) throw new Error("system.internal_error");
  return payment;
}

export async function createWallet(userId: string, _token?: string): Promise<WalletBalanceData> {
  await delay();
  return { userId, balance: 0 };
}
