import { describe, it, expect } from "vitest";
import { CreateEnrollmentSchema } from "@/lib/validators/enrollment";

describe("CreateEnrollmentSchema", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    const result = CreateEnrollmentSchema.safeParse({ paymentDate: "2026-05-20" });
    expect(result.success).toBe(true);
  });

  it("rejects a date with wrong separator", () => {
    const result = CreateEnrollmentSchema.safeParse({ paymentDate: "2026/05/20" });
    expect(result.success).toBe(false);
  });

  it("rejects a date with wrong format (DD-MM-YYYY)", () => {
    const result = CreateEnrollmentSchema.safeParse({ paymentDate: "20-05-2026" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty paymentDate", () => {
    const result = CreateEnrollmentSchema.safeParse({ paymentDate: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing paymentDate field", () => {
    const result = CreateEnrollmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-date string", () => {
    const result = CreateEnrollmentSchema.safeParse({ paymentDate: "not-a-date" });
    expect(result.success).toBe(false);
  });
});
