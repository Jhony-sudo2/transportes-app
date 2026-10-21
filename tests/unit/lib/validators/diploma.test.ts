import { describe, it, expect } from "vitest";
import { DiplomaSchema, DiplomaListSchema } from "@/lib/validators/diploma";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

describe("DiplomaSchema — PARTICIPATION diploma", () => {
  const VALID_PARTICIPATION = {
    id: VALID_UUID,
    userId: VALID_UUID,
    congressId: VALID_UUID,
    type: "PARTICIPATION" as const,
    activityId: null,
    issuedAt: "2026-08-01T00:00:00Z",
    congressName: "Congreso USAC 2026",
    activityName: null,
    available: true,
  };

  it("accepts a valid PARTICIPATION diploma", () => {
    expect(DiplomaSchema.safeParse(VALID_PARTICIPATION).success).toBe(true);
  });

  it("accepts PARTICIPATION with available = false", () => {
    expect(DiplomaSchema.safeParse({ ...VALID_PARTICIPATION, available: false }).success).toBe(true);
  });

  it("accepts PARTICIPATION with null activityId", () => {
    expect(DiplomaSchema.safeParse({ ...VALID_PARTICIPATION, activityId: null }).success).toBe(true);
  });

  it("accepts PARTICIPATION with null activityName", () => {
    expect(DiplomaSchema.safeParse({ ...VALID_PARTICIPATION, activityName: null }).success).toBe(true);
  });
});

describe("DiplomaSchema — LEADERSHIP diploma", () => {
  const VALID_LEADERSHIP = {
    id: VALID_UUID,
    userId: VALID_UUID,
    congressId: VALID_UUID,
    type: "LEADERSHIP" as const,
    activityId: VALID_UUID,
    issuedAt: "2026-08-01T00:00:00Z",
    congressName: "Congreso USAC 2026",
    activityName: "Machine Learning Avanzado",
    available: true,
  };

  it("accepts a valid LEADERSHIP diploma", () => {
    expect(DiplomaSchema.safeParse(VALID_LEADERSHIP).success).toBe(true);
  });

  it("accepts LEADERSHIP with non-null activityId", () => {
    expect(DiplomaSchema.safeParse({ ...VALID_LEADERSHIP, activityId: VALID_UUID }).success).toBe(true);
  });
});

describe("DiplomaSchema — validaciones", () => {
  const BASE = {
    id: VALID_UUID,
    userId: VALID_UUID,
    congressId: VALID_UUID,
    type: "PARTICIPATION" as const,
    activityId: null,
    issuedAt: "2026-08-01T00:00:00Z",
    congressName: "Congreso USAC 2026",
    activityName: null,
    available: true,
  };

  it("rejects invalid type", () => {
    expect(DiplomaSchema.safeParse({ ...BASE, type: "ASISTENCIA" }).success).toBe(false);
  });

  it("rejects invalid id UUID", () => {
    expect(DiplomaSchema.safeParse({ ...BASE, id: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid userId UUID", () => {
    expect(DiplomaSchema.safeParse({ ...BASE, userId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid congressId UUID", () => {
    expect(DiplomaSchema.safeParse({ ...BASE, congressId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid activityId UUID when not null", () => {
    expect(DiplomaSchema.safeParse({ ...BASE, activityId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects missing available field", () => {
    const { available: _, ...withoutAvailable } = BASE;
    expect(DiplomaSchema.safeParse(withoutAvailable).success).toBe(false);
  });

  it("rejects missing congressName", () => {
    const { congressName: _, ...withoutName } = BASE;
    expect(DiplomaSchema.safeParse(withoutName).success).toBe(false);
  });
});

describe("DiplomaListSchema", () => {
  it("accepts an empty list", () => {
    expect(
      DiplomaListSchema.safeParse({ items: [], totalItems: 0, totalPages: 0 }).success,
    ).toBe(true);
  });

  it("accepts a list with one diploma", () => {
    const diploma = {
      id: VALID_UUID,
      userId: VALID_UUID,
      congressId: VALID_UUID,
      type: "PARTICIPATION",
      activityId: null,
      issuedAt: "2026-08-01T00:00:00Z",
      congressName: "Congreso 2026",
      activityName: null,
      available: true,
    };
    expect(
      DiplomaListSchema.safeParse({ items: [diploma], totalItems: 1, totalPages: 1 }).success,
    ).toBe(true);
  });

  it("rejects negative totalPages", () => {
    expect(
      DiplomaListSchema.safeParse({ items: [], totalItems: 0, totalPages: -1 }).success,
    ).toBe(false);
  });
});
