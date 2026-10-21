import { describe, it, expect } from "vitest";
import { UpdateSystemConfigSchema, SystemConfigSchema } from "@/lib/validators/system-config";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

describe("UpdateSystemConfigSchema — camino feliz", () => {
  it("accepts commissionPercent = 10 (typical value)", () => {
    expect(UpdateSystemConfigSchema.safeParse({ commissionPercent: 10 }).success).toBe(true);
  });

  it("accepts commissionPercent = 0 (no commission)", () => {
    expect(UpdateSystemConfigSchema.safeParse({ commissionPercent: 0 }).success).toBe(true);
  });

  it("accepts commissionPercent = 100 (full commission)", () => {
    expect(UpdateSystemConfigSchema.safeParse({ commissionPercent: 100 }).success).toBe(true);
  });

  it("accepts fractional commissionPercent (e.g. 7.5)", () => {
    expect(UpdateSystemConfigSchema.safeParse({ commissionPercent: 7.5 }).success).toBe(true);
  });

  it("accepts commissionPercent = 50", () => {
    expect(UpdateSystemConfigSchema.safeParse({ commissionPercent: 50 }).success).toBe(true);
  });
});

describe("UpdateSystemConfigSchema — limites de rango", () => {
  it("rejects commissionPercent below 0", () => {
    const result = UpdateSystemConfigSchema.safeParse({ commissionPercent: -0.01 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["commissionPercent"]).toBeDefined();
    }
  });

  it("rejects commissionPercent = -1", () => {
    const result = UpdateSystemConfigSchema.safeParse({ commissionPercent: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["commissionPercent"]).toBeDefined();
    }
  });

  it("rejects commissionPercent above 100", () => {
    const result = UpdateSystemConfigSchema.safeParse({ commissionPercent: 100.01 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["commissionPercent"]).toBeDefined();
    }
  });

  it("rejects commissionPercent = 101", () => {
    const result = UpdateSystemConfigSchema.safeParse({ commissionPercent: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects commissionPercent as string", () => {
    const result = UpdateSystemConfigSchema.safeParse({ commissionPercent: "10" });
    expect(result.success).toBe(false);
  });

  it("rejects missing commissionPercent field", () => {
    expect(UpdateSystemConfigSchema.safeParse({}).success).toBe(false);
  });
});

describe("SystemConfigSchema — response parsing", () => {
  const VALID_CONFIG = {
    commissionPercent: 10,
    updatedBy: VALID_UUID,
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("accepts a valid system config", () => {
    expect(SystemConfigSchema.safeParse(VALID_CONFIG).success).toBe(true);
  });

  it("accepts null updatedBy and updatedAt (pristine config)", () => {
    expect(
      SystemConfigSchema.safeParse({ commissionPercent: 10, updatedBy: null, updatedAt: null }).success,
    ).toBe(true);
  });

  it("accepts commissionPercent = 0", () => {
    expect(SystemConfigSchema.safeParse({ ...VALID_CONFIG, commissionPercent: 0 }).success).toBe(true);
  });

  it("rejects commissionPercent below 0 in response", () => {
    expect(SystemConfigSchema.safeParse({ ...VALID_CONFIG, commissionPercent: -5 }).success).toBe(false);
  });

  it("rejects commissionPercent above 100 in response", () => {
    expect(SystemConfigSchema.safeParse({ ...VALID_CONFIG, commissionPercent: 105 }).success).toBe(false);
  });

  it("rejects invalid updatedBy UUID", () => {
    expect(SystemConfigSchema.safeParse({ ...VALID_CONFIG, updatedBy: "not-a-uuid" }).success).toBe(false);
  });
});
