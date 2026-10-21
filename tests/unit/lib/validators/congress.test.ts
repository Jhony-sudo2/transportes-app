import { describe, it, expect } from "vitest";
import { CreateCongressSchema } from "@/lib/validators/congress";

describe("CreateCongressSchema", () => {
  const VALID = {
    name: "Congreso de Prueba",
    description: "Descripcion de prueba",
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    location: "Guatemala City",
    price: 35,
    institutionId: "11111111-0000-0000-0000-000000000001",
  };

  it("accepts a valid congress with price == 35.00", () => {
    expect(CreateCongressSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a valid congress with price > 35.00", () => {
    expect(CreateCongressSchema.safeParse({ ...VALID, price: 100 }).success).toBe(true);
  });

  it("rejects price below 35.00", () => {
    const result = CreateCongressSchema.safeParse({ ...VALID, price: 34.99 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["price"]).toBeDefined();
    }
  });

  it("rejects missing name", () => {
    const result = CreateCongressSchema.safeParse({ ...VALID, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid institutionId format", () => {
    const result = CreateCongressSchema.safeParse({ ...VALID, institutionId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = CreateCongressSchema.safeParse({ ...VALID, description: "" });
    expect(result.success).toBe(false);
  });
});
