import { describe, it, expect } from "vitest";
import {
  ParticipantReportSchema,
  AttendanceByActivityReportSchema,
  WorkshopReservationReportSchema,
  EarningsByCongressReportSchema,
  EarningsReportSchema,
  CongressesByInstitutionReportSchema,
} from "@/lib/validators/reports";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";
const UUID_2 = "22222222-0000-0000-0000-000000000002";

// ─── ParticipantReportSchema ──────────────────────────────────────────────────

describe("ParticipantReportSchema", () => {
  const VALID_ROW = {
    personalId: "USR001",
    fullName: "Ana Lopez",
    organization: "USAC",
    email: "ana@usac.edu.gt",
    phone: "55551234",
    participationTypes: ["PONENCIA", "TALLER"],
  };

  it("accepts a valid participant report", () => {
    expect(
      ParticipantReportSchema.safeParse({ items: [VALID_ROW], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("accepts empty participationTypes array", () => {
    const row = { ...VALID_ROW, participationTypes: [] };
    expect(ParticipantReportSchema.safeParse({ items: [row], totalItems: 1 }).success).toBe(true);
  });

  it("accepts zero totalItems with empty list", () => {
    expect(ParticipantReportSchema.safeParse({ items: [], totalItems: 0 }).success).toBe(true);
  });

  it("rejects negative totalItems", () => {
    const result = ParticipantReportSchema.safeParse({ items: [], totalItems: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["totalItems"]).toBeDefined();
    }
  });

  it("rejects missing personalId in a row", () => {
    const { personalId: _, ...withoutId } = VALID_ROW;
    expect(ParticipantReportSchema.safeParse({ items: [withoutId], totalItems: 1 }).success).toBe(false);
  });

  it("rejects participationTypes as non-array", () => {
    const invalid = { ...VALID_ROW, participationTypes: "PONENCIA" };
    expect(ParticipantReportSchema.safeParse({ items: [invalid], totalItems: 1 }).success).toBe(false);
  });
});

// ─── AttendanceByActivityReportSchema ─────────────────────────────────────────

describe("AttendanceByActivityReportSchema", () => {
  const VALID_ROW = {
    activityId: VALID_UUID,
    activityName: "Taller de Python",
    roomName: "Auditorio A",
    startTime: "2026-07-15T09:00:00Z",
    endTime: "2026-07-15T10:00:00Z",
    attendanceCount: 25,
  };

  it("accepts a valid attendance report", () => {
    expect(
      AttendanceByActivityReportSchema.safeParse({ items: [VALID_ROW], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("accepts zero attendanceCount", () => {
    const row = { ...VALID_ROW, attendanceCount: 0 };
    expect(
      AttendanceByActivityReportSchema.safeParse({ items: [row], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("rejects invalid activityId UUID", () => {
    const result = AttendanceByActivityReportSchema.safeParse({
      items: [{ ...VALID_ROW, activityId: "not-a-uuid" }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative attendanceCount", () => {
    const result = AttendanceByActivityReportSchema.safeParse({
      items: [{ ...VALID_ROW, attendanceCount: -1 }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing activityName", () => {
    const { activityName: _, ...withoutName } = VALID_ROW;
    expect(
      AttendanceByActivityReportSchema.safeParse({ items: [withoutName], totalItems: 1 }).success,
    ).toBe(false);
  });
});

// ─── WorkshopReservationReportSchema ──────────────────────────────────────────

describe("WorkshopReservationReportSchema", () => {
  const VALID_ROSTER_ENTRY = {
    personalId: "P001",
    fullName: "Carlos Mendez",
    email: "carlos@usac.gt",
    participationType: "TALLER",
  };

  const VALID_ROW = {
    activityId: VALID_UUID,
    activityName: "Taller de ML",
    workshopCapacity: 30,
    reservationCount: 20,
    availableSeats: 10,
    roster: [VALID_ROSTER_ENTRY],
  };

  it("accepts a valid workshop reservation report", () => {
    expect(
      WorkshopReservationReportSchema.safeParse({ items: [VALID_ROW], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("accepts empty roster", () => {
    const row = { ...VALID_ROW, roster: [] };
    expect(
      WorkshopReservationReportSchema.safeParse({ items: [row], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("accepts zero reservationCount and zero availableSeats when capacity equals reservations", () => {
    const fullWorkshop = { ...VALID_ROW, reservationCount: 30, availableSeats: 0 };
    expect(
      WorkshopReservationReportSchema.safeParse({ items: [fullWorkshop], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("rejects non-positive workshopCapacity", () => {
    const result = WorkshopReservationReportSchema.safeParse({
      items: [{ ...VALID_ROW, workshopCapacity: 0 }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative reservationCount", () => {
    const result = WorkshopReservationReportSchema.safeParse({
      items: [{ ...VALID_ROW, reservationCount: -1 }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative availableSeats", () => {
    const result = WorkshopReservationReportSchema.safeParse({
      items: [{ ...VALID_ROW, availableSeats: -1 }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid activityId UUID", () => {
    const result = WorkshopReservationReportSchema.safeParse({
      items: [{ ...VALID_ROW, activityId: "not-a-uuid" }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ─── EarningsByCongressReportSchema ───────────────────────────────────────────

describe("EarningsByCongressReportSchema", () => {
  const VALID_ROW = {
    congressId: VALID_UUID,
    congressName: "Congreso USAC 2026",
    totalAmount: 5000,
    commissionAmount: 500,
    netAmount: 4500,
    paymentCount: 50,
  };

  it("accepts a valid earnings by congress report", () => {
    expect(
      EarningsByCongressReportSchema.safeParse({
        items: [VALID_ROW],
        totalItems: 1,
        grandTotal: 5000,
      }).success,
    ).toBe(true);
  });

  it("accepts zero amounts (no enrollments)", () => {
    const zeroRow = {
      ...VALID_ROW,
      totalAmount: 0,
      commissionAmount: 0,
      netAmount: 0,
      paymentCount: 0,
    };
    expect(
      EarningsByCongressReportSchema.safeParse({
        items: [zeroRow],
        totalItems: 1,
        grandTotal: 0,
      }).success,
    ).toBe(true);
  });

  it("rejects negative totalAmount", () => {
    const result = EarningsByCongressReportSchema.safeParse({
      items: [{ ...VALID_ROW, totalAmount: -100 }],
      totalItems: 1,
      grandTotal: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative commissionAmount", () => {
    const result = EarningsByCongressReportSchema.safeParse({
      items: [{ ...VALID_ROW, commissionAmount: -1 }],
      totalItems: 1,
      grandTotal: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid congressId UUID", () => {
    const result = EarningsByCongressReportSchema.safeParse({
      items: [{ ...VALID_ROW, congressId: "not-a-uuid" }],
      totalItems: 1,
      grandTotal: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative grandTotal", () => {
    const result = EarningsByCongressReportSchema.safeParse({
      items: [VALID_ROW],
      totalItems: 1,
      grandTotal: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing grandTotal", () => {
    const result = EarningsByCongressReportSchema.safeParse({
      items: [VALID_ROW],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ─── EarningsReportSchema (SystemAdmin) ───────────────────────────────────────

describe("EarningsReportSchema", () => {
  const VALID_CONGRESS_EARNINGS = {
    congressId: VALID_UUID,
    congressName: "Congreso USAC 2026",
    totalAmount: 5000,
    commissionAmount: 500,
    netAmount: 4500,
  };

  const VALID_INSTITUTION_ROW = {
    institutionId: VALID_UUID,
    institutionName: "USAC",
    congresses: [VALID_CONGRESS_EARNINGS],
    institutionTotalAmount: 5000,
    institutionTotalCommission: 500,
    institutionTotalNet: 4500,
  };

  const VALID_REPORT = {
    items: [VALID_INSTITUTION_ROW],
    grandTotalAmount: 5000,
    grandTotalCommission: 500,
    grandTotalNet: 4500,
  };

  it("accepts a valid earnings report", () => {
    expect(EarningsReportSchema.safeParse(VALID_REPORT).success).toBe(true);
  });

  it("accepts multiple institutions", () => {
    const secondInstitution = {
      ...VALID_INSTITUTION_ROW,
      institutionId: UUID_2,
      institutionName: "URL",
    };
    expect(
      EarningsReportSchema.safeParse({
        ...VALID_REPORT,
        items: [VALID_INSTITUTION_ROW, secondInstitution],
        grandTotalAmount: 10000,
        grandTotalCommission: 1000,
        grandTotalNet: 9000,
      }).success,
    ).toBe(true);
  });

  it("accepts zero grand totals for no-data report", () => {
    expect(
      EarningsReportSchema.safeParse({
        items: [],
        grandTotalAmount: 0,
        grandTotalCommission: 0,
        grandTotalNet: 0,
      }).success,
    ).toBe(true);
  });

  it("rejects negative grandTotalAmount", () => {
    const result = EarningsReportSchema.safeParse({ ...VALID_REPORT, grandTotalAmount: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects negative grandTotalCommission", () => {
    const result = EarningsReportSchema.safeParse({ ...VALID_REPORT, grandTotalCommission: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects negative grandTotalNet", () => {
    const result = EarningsReportSchema.safeParse({ ...VALID_REPORT, grandTotalNet: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid institutionId UUID", () => {
    const invalidRow = { ...VALID_INSTITUTION_ROW, institutionId: "not-a-uuid" };
    const result = EarningsReportSchema.safeParse({ ...VALID_REPORT, items: [invalidRow] });
    expect(result.success).toBe(false);
  });

  it("rejects institution row with empty congresses array (valid — institution with no congress data)", () => {
    const emptyRow = { ...VALID_INSTITUTION_ROW, congresses: [] };
    expect(
      EarningsReportSchema.safeParse({ ...VALID_REPORT, items: [emptyRow] }).success,
    ).toBe(true);
  });

  it("rejects missing grandTotalAmount", () => {
    const { grandTotalAmount: _, ...withoutTotal } = VALID_REPORT;
    expect(EarningsReportSchema.safeParse(withoutTotal).success).toBe(false);
  });
});

// ─── CongressesByInstitutionReportSchema ──────────────────────────────────────

describe("CongressesByInstitutionReportSchema", () => {
  const VALID_ROW = {
    institutionId: VALID_UUID,
    institutionName: "USAC",
    congressId: UUID_2,
    congressName: "Congreso USAC 2026",
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    location: "Guatemala City",
    price: 150,
  };

  it("accepts a valid congresses by institution report", () => {
    expect(
      CongressesByInstitutionReportSchema.safeParse({ items: [VALID_ROW], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("accepts zero price (free congress edge case)", () => {
    const row = { ...VALID_ROW, price: 0 };
    expect(
      CongressesByInstitutionReportSchema.safeParse({ items: [row], totalItems: 1 }).success,
    ).toBe(true);
  });

  it("accepts empty items list", () => {
    expect(
      CongressesByInstitutionReportSchema.safeParse({ items: [], totalItems: 0 }).success,
    ).toBe(true);
  });

  it("rejects invalid institutionId UUID", () => {
    const result = CongressesByInstitutionReportSchema.safeParse({
      items: [{ ...VALID_ROW, institutionId: "not-a-uuid" }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid congressId UUID", () => {
    const result = CongressesByInstitutionReportSchema.safeParse({
      items: [{ ...VALID_ROW, congressId: "not-a-uuid" }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = CongressesByInstitutionReportSchema.safeParse({
      items: [{ ...VALID_ROW, price: -10 }],
      totalItems: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative totalItems", () => {
    const result = CongressesByInstitutionReportSchema.safeParse({
      items: [],
      totalItems: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing location", () => {
    const { location: _, ...withoutLocation } = VALID_ROW;
    expect(
      CongressesByInstitutionReportSchema.safeParse({ items: [withoutLocation], totalItems: 1 }).success,
    ).toBe(false);
  });
});
