import "server-only";

import { apiFetch, apiResponseOf } from "./client";
import {
  WalletBalanceSchema,
  TransactionListSchema,
  TopUpSchema,
  PaymentSchema,
  type WalletBalanceData,
  type TransactionListData,
  type TopUpData,
  type PaymentData,
} from "@/lib/validators/wallet";
import { SystemConfigSchema, type SystemConfigData } from "@/lib/validators/system-config";
import { z } from "zod";

const GATEWAY = process.env["GATEWAY_URL"] ?? "http://localhost:8080";
const WALLET_URL = `${GATEWAY}/api/v1`;

// --- Wallet ---

export async function getWalletBalance(token: string): Promise<WalletBalanceData> {
  return apiFetch(`${WALLET_URL}/wallet/balance`, apiResponseOf(WalletBalanceSchema), { token });
}

export async function getWalletTransactions(
  token: string,
  params: URLSearchParams,
): Promise<TransactionListData> {
  return apiFetch(
    `${WALLET_URL}/wallet/transactions?${params.toString()}`,
    apiResponseOf(TransactionListSchema),
    { token },
  );
}

export async function topUpWallet(data: TopUpData, token: string): Promise<WalletBalanceData> {
  const validated = TopUpSchema.parse(data);
  return apiFetch(`${WALLET_URL}/wallet/top-up`, apiResponseOf(WalletBalanceSchema), {
    method: "POST",
    body: validated,
    token,
  });
}

// --- Payments ---

export async function getPayment(id: string, token: string): Promise<PaymentData> {
  return apiFetch(`${WALLET_URL}/payments/${id}`, apiResponseOf(PaymentSchema), { token });
}

export async function listPayments(
  token: string,
  params: URLSearchParams,
): Promise<{ items: PaymentData[]; totalItems: number; totalPages: number }> {
  const PaymentListSchema = z.object({
    items: z.array(PaymentSchema),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });
  return apiFetch(
    `${WALLET_URL}/payments?${params.toString()}`,
    apiResponseOf(PaymentListSchema),
    { token },
  );
}

// --- System Config ---

export async function getSystemConfig(token: string): Promise<SystemConfigData> {
  return apiFetch(`${WALLET_URL}/system/config`, apiResponseOf(SystemConfigSchema), { token });
}

export async function updateSystemConfig(
  commissionPercent: number,
  token: string,
): Promise<SystemConfigData> {
  return apiFetch(`${WALLET_URL}/system/config`, apiResponseOf(SystemConfigSchema), {
    method: "PUT",
    body: { commissionPercent },
    token,
  });
}

export async function registerPayment(
  data: unknown,
  token: string,
  idempotencyKey: string,
): Promise<PaymentData> {
  return apiFetch(`${WALLET_URL}/payments/register`, apiResponseOf(PaymentSchema), {
    method: "POST",
    body: data,
    token,
    idempotencyKey,
  });
}

export async function createWallet(userId: string, token?: string): Promise<WalletBalanceData> {
  return apiFetch(`${WALLET_URL}/wallets`, apiResponseOf(WalletBalanceSchema), {
    method: "POST",
    body: { userId },
    ...(token !== undefined && { token }),
  });
}
