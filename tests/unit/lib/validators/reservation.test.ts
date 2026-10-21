import { describe, it, expect } from "vitest";
import { ReservationSchema } from "@/lib/validators/reservation";

describe("ReservationSchema", () => {
  const VALID = {
    id: "11111111-0000-0000-0000-000000000001",
    activityId: "22222222-0000-0000-0000-000000000001",
    userId: "33333333-0000-0000-0000-000000000001",
    reservedAt: "2026-05-20T10:00:00Z",
  };

  it("accepts a valid reservation", () => {
    expect(ReservationSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a reservation with invalid id UUID", () => {
    const result = ReservationSchema.safeParse({ ...VALID, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a reservation with invalid activityId UUID", () => {
    const result = ReservationSchema.safeParse({ ...VALID, activityId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a reservation with invalid userId UUID", () => {
    const result = ReservationSchema.safeParse({ ...VALID, userId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a reservation with missing reservedAt", () => {
    const { reservedAt: _, ...withoutDate } = VALID;
    const result = ReservationSchema.safeParse(withoutDate);
    expect(result.success).toBe(false);
  });
});
