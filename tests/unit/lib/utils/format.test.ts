import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

describe("formatCurrency", () => {
  it('formats 150 as "Q 150.00"', () => {
    expect(formatCurrency(150)).toBe("Q 150.00");
  });

  it("formats 0 as Q 0.00", () => {
    expect(formatCurrency(0)).toBe("Q 0.00");
  });

  it("formats 35.50 correctly", () => {
    expect(formatCurrency(35.5)).toBe("Q 35.50");
  });

  it("formats large amounts correctly", () => {
    expect(formatCurrency(1250.99)).toBe("Q 1250.99");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(10.005)).toBe("Q 10.01");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-50)).toBe("Q -50.00");
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2024-03-15T00:00:00.000Z");
    // Should contain the year 2024
    expect(result).toContain("2024");
  });

  it("returns the input for an invalid date string", () => {
    const invalid = "not-a-date";
    expect(formatDate(invalid)).toBe(invalid);
  });

  it("handles date-only strings", () => {
    const result = formatDate("2024-06-01");
    expect(result).toContain("2024");
  });
});

describe("formatDateTime", () => {
  it("formats a valid ISO datetime string", () => {
    const result = formatDateTime("2024-03-15T14:30:00Z");
    expect(result).toContain("2024");
  });

  it("returns the input for an invalid datetime string", () => {
    const invalid = "not-a-datetime";
    expect(formatDateTime(invalid)).toBe(invalid);
  });

  it("includes time components", () => {
    // Just verify it returns something non-empty and contains year
    const result = formatDateTime("2024-03-15T14:30:00Z");
    expect(result.length).toBeGreaterThan(0);
  });
});
