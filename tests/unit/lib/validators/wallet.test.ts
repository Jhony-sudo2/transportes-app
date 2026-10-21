import { describe, it, expect } from "vitest";
import { TopUpSchema, WalletBalanceSchema, TransactionSchema, PaymentSchema } from "@/lib/validators/wallet";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

describe("TopUpSchema", () => {
  it("accepts a valid top-up", () => {
    expect(TopUpSchema.safeParse({ amount: 100, paymentDate: "2026-07-01" }).success).toBe(true);
  });

  it("accepts a fractional amount", () => {
    expect(TopUpSchema.safeParse({ amount: 50.75, paymentDate: "2026-07-01" }).success).toBe(true);
  });

  it("rejects amount = 0", () => {
    const result = TopUpSchema.safeParse({ amount: 0, paymentDate: "2026-07-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["amount"]).toBeDefined();
    }
  });

  it("rejects negative amount", () => {
    const result = TopUpSchema.safeParse({ amount: -50, paymentDate: "2026-07-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["amount"]).toBeDefined();
    }
  });

  it("rejects empty paymentDate", () => {
    const result = TopUpSchema.safeParse({ amount: 100, paymentDate: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["paymentDate"]).toBeDefined();
    }
  });

  it("rejects missing paymentDate field", () => {
    const result = TopUpSchema.safeParse({ amount: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects missing amount field", () => {
    const result = TopUpSchema.safeParse({ paymentDate: "2026-07-01" });
    expect(result.success).toBe(false);
  });

  it("rejects amount as string", () => {
    const result = TopUpSchema.safeParse({ amount: "100", paymentDate: "2026-07-01" });
    expect(result.success).toBe(false);
  });
});

describe("WalletBalanceSchema", () => {
  it("accepts a valid balance", () => {
    expect(WalletBalanceSchema.safeParse({ userId: VALID_UUID, balance: 250.5 }).success).toBe(true);
  });

  it("accepts zero balance", () => {
    expect(WalletBalanceSchema.safeParse({ userId: VALID_UUID, balance: 0 }).success).toBe(true);
  });

  it("rejects negative balance (domain invariant)", () => {
    const result = WalletBalanceSchema.safeParse({ userId: VALID_UUID, balance: -10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["balance"]).toBeDefined();
    }
  });

  it("rejects invalid userId UUID", () => {
    const result = WalletBalanceSchema.safeParse({ userId: "not-a-uuid", balance: 100 });
    expect(result.success).toBe(false);
  });
});

describe("TransactionSchema", () => {
  const VALID_TOP_UP = {
    id: VALID_UUID,
    walletUserId: VALID_UUID,
    type: "TOP_UP" as const,
    amount: 100,
    transactionDate: "2026-07-01",
    referencePaymentId: null,
    createdAt: "2026-07-01T00:00:00Z",
  };

  const VALID_PAYMENT = {
    ...VALID_TOP_UP,
    type: "PAYMENT" as const,
    amount: -50,
    referencePaymentId: VALID_UUID,
  };

  it("accepts a valid TOP_UP transaction", () => {
    expect(TransactionSchema.safeParse(VALID_TOP_UP).success).toBe(true);
  });

  it("accepts a valid PAYMENT transaction with referencePaymentId", () => {
    expect(TransactionSchema.safeParse(VALID_PAYMENT).success).toBe(true);
  });

  it("accepts null referencePaymentId for TOP_UP", () => {
    expect(TransactionSchema.safeParse({ ...VALID_TOP_UP, referencePaymentId: null }).success).toBe(true);
  });

  it("rejects invalid transaction type", () => {
    expect(TransactionSchema.safeParse({ ...VALID_TOP_UP, type: "REFUND" }).success).toBe(false);
  });

  it("rejects invalid walletUserId UUID", () => {
    expect(TransactionSchema.safeParse({ ...VALID_TOP_UP, walletUserId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid referencePaymentId UUID when not null", () => {
    expect(TransactionSchema.safeParse({ ...VALID_PAYMENT, referencePaymentId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("PaymentSchema", () => {
  const VALID_PAYMENT = {
    id: VALID_UUID,
    userId: VALID_UUID,
    congressId: VALID_UUID,
    institutionId: VALID_UUID,
    congressNameSnapshot: "Congreso USAC 2026",
    institutionNameSnapshot: "USAC",
    commissionPercentSnapshot: 10,
    amount: 100,
    commissionAmount: 10,
    netAmount: 90,
    paymentDate: "2026-07-01",
    idempotencyKey: "some-key-123",
    createdAt: "2026-07-01T00:00:00Z",
  };

  it("accepts a valid payment", () => {
    expect(PaymentSchema.safeParse(VALID_PAYMENT).success).toBe(true);
  });

  it("accepts commissionAmount = 0 (zero commission config)", () => {
    expect(PaymentSchema.safeParse({ ...VALID_PAYMENT, commissionAmount: 0, netAmount: 100 }).success).toBe(true);
  });

  it("rejects non-positive amount", () => {
    const result = PaymentSchema.safeParse({ ...VALID_PAYMENT, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["amount"]).toBeDefined();
    }
  });

  it("rejects negative commissionAmount", () => {
    const result = PaymentSchema.safeParse({ ...VALID_PAYMENT, commissionAmount: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects negative netAmount", () => {
    const result = PaymentSchema.safeParse({ ...VALID_PAYMENT, netAmount: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid congressId UUID", () => {
    expect(PaymentSchema.safeParse({ ...VALID_PAYMENT, congressId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects negative commissionPercentSnapshot", () => {
    const result = PaymentSchema.safeParse({ ...VALID_PAYMENT, commissionPercentSnapshot: -1 });
    expect(result.success).toBe(false);
  });
});
