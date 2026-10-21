import { describe, it, expect } from "vitest";
import { RegisterAttendanceSchema, AttendanceSchema, AttendanceListSchema } from "@/lib/validators/attendance";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

describe("RegisterAttendanceSchema — camino feliz", () => {
  it("accepts a valid attendance registration", () => {
    expect(
      RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "12345678" }).success,
    ).toBe(true);
  });

  it("accepts alphabetical personalId", () => {
    expect(
      RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "ABCDEF" }).success,
    ).toBe(true);
  });

  it("accepts mixed alphanumeric personalId", () => {
    expect(
      RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "DPI2024GT" }).success,
    ).toBe(true);
  });
});

describe("RegisterAttendanceSchema — validaciones de activityId", () => {
  it("rejects invalid activityId UUID", () => {
    const result = RegisterAttendanceSchema.safeParse({ activityId: "not-a-uuid", personalId: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["activityId"]).toBeDefined();
    }
  });

  it("rejects missing activityId", () => {
    expect(RegisterAttendanceSchema.safeParse({ personalId: "12345" }).success).toBe(false);
  });
});

describe("RegisterAttendanceSchema — validaciones de personalId", () => {
  it("rejects empty personalId", () => {
    const result = RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["personalId"]).toBeDefined();
    }
  });

  it("rejects personalId with spaces", () => {
    const result = RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "DPI 2024" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["personalId"]).toBeDefined();
    }
  });

  it("rejects personalId with hyphens", () => {
    const result = RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "DPI-2024" });
    expect(result.success).toBe(false);
  });

  it("rejects personalId with special characters (@, #, etc.)", () => {
    expect(
      RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID, personalId: "DPI@2024" }).success,
    ).toBe(false);
  });

  it("rejects missing personalId", () => {
    expect(RegisterAttendanceSchema.safeParse({ activityId: VALID_UUID }).success).toBe(false);
  });
});

describe("AttendanceSchema — response parsing", () => {
  const VALID_ATTENDANCE = {
    id: VALID_UUID,
    activityId: VALID_UUID,
    personalId: "12345678",
    registeredBy: VALID_UUID,
    registeredAt: "2026-07-15T09:30:00Z",
  };

  it("accepts a valid attendance record", () => {
    expect(AttendanceSchema.safeParse(VALID_ATTENDANCE).success).toBe(true);
  });

  it("rejects invalid activityId UUID", () => {
    expect(AttendanceSchema.safeParse({ ...VALID_ATTENDANCE, activityId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid registeredBy UUID", () => {
    expect(AttendanceSchema.safeParse({ ...VALID_ATTENDANCE, registeredBy: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects missing personalId", () => {
    const { personalId: _, ...withoutId } = VALID_ATTENDANCE;
    expect(AttendanceSchema.safeParse(withoutId).success).toBe(false);
  });
});

describe("AttendanceListSchema", () => {
  it("accepts an empty list", () => {
    expect(
      AttendanceListSchema.safeParse({ items: [], totalItems: 0, totalPages: 0 }).success,
    ).toBe(true);
  });

  it("accepts a list with one attendance record", () => {
    const record = {
      id: VALID_UUID,
      activityId: VALID_UUID,
      personalId: "12345678",
      registeredBy: VALID_UUID,
      registeredAt: "2026-07-15T09:30:00Z",
    };
    expect(
      AttendanceListSchema.safeParse({ items: [record], totalItems: 1, totalPages: 1 }).success,
    ).toBe(true);
  });

  it("rejects negative totalItems", () => {
    expect(
      AttendanceListSchema.safeParse({ items: [], totalItems: -1, totalPages: 0 }).success,
    ).toBe(false);
  });
});
