import { z } from "zod";

// --- CongressAdmin reports ---

export const ParticipantReportRowSchema = z.object({
  personalId: z.string().nullable().transform((v) => v ?? ""),
  fullName: z.string().nullable().transform((v) => v ?? ""),
  organization: z.string().nullable().transform((v) => v ?? ""),
  email: z.string().nullable().transform((v) => v ?? ""),
  phone: z.string().nullable().transform((v) => v ?? ""),
  participationTypes: z.array(z.string()),
});

export const ParticipantReportSchema = z.object({
  items: z.array(ParticipantReportRowSchema),
  totalItems: z.number().int().nonnegative(),
});

export const AttendanceByActivityRowSchema = z.object({
  activityId: z.string().uuid(),
  activityName: z.string(),
  roomName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  attendanceCount: z.number().int().nonnegative(),
});

export const AttendanceByActivityReportSchema = z.object({
  items: z.array(AttendanceByActivityRowSchema),
  totalItems: z.number().int().nonnegative(),
});

const RosterEntrySchema = z.object({
  personalId: z.string(),
  fullName: z.string(),
  email: z.string(),
  participationType: z.string(),
});

export const WorkshopReservationRowSchema = z.object({
  activityId: z.string().uuid(),
  activityName: z.string(),
  workshopCapacity: z.number().int().positive(),
  reservationCount: z.number().int().nonnegative(),
  availableSeats: z.number().int().nonnegative(),
  roster: z.array(RosterEntrySchema),
});

export const WorkshopReservationReportSchema = z.object({
  items: z.array(WorkshopReservationRowSchema),
  totalItems: z.number().int().nonnegative(),
});

export const EarningsByCongressRowSchema = z.object({
  congressId: z.string().uuid(),
  congressName: z.string(),
  totalAmount: z.number().nonnegative(),
  commissionAmount: z.number().nonnegative(),
  netAmount: z.number().nonnegative(),
  paymentCount: z.number().int().nonnegative(),
});

export const EarningsByCongressReportSchema = z.object({
  items: z.array(EarningsByCongressRowSchema),
  totalItems: z.number().int().nonnegative(),
  grandTotal: z.number().nonnegative(),
});

// --- SystemAdmin reports ---

const CongressEarningsRowSchema = z.object({
  congressId: z.string().uuid(),
  congressName: z.string(),
  totalAmount: z.number().nonnegative(),
  commissionAmount: z.number().nonnegative(),
  netAmount: z.number().nonnegative(),
});

export const EarningsRowSchema = z.object({
  institutionId: z.string().uuid(),
  institutionName: z.string(),
  congresses: z.array(CongressEarningsRowSchema),
  institutionTotalAmount: z.number().nonnegative(),
  institutionTotalCommission: z.number().nonnegative(),
  institutionTotalNet: z.number().nonnegative(),
});

export const EarningsReportSchema = z.object({
  items: z.array(EarningsRowSchema),
  grandTotalAmount: z.number().nonnegative(),
  grandTotalCommission: z.number().nonnegative(),
  grandTotalNet: z.number().nonnegative(),
});

export const CongressesByInstitutionRowSchema = z.object({
  institutionId: z.string().uuid(),
  institutionName: z.string(),
  congressId: z.string().uuid(),
  congressName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  price: z.number().nonnegative(),
});

export const CongressesByInstitutionReportSchema = z.object({
  items: z.array(CongressesByInstitutionRowSchema),
  totalItems: z.number().int().nonnegative(),
});

export type ParticipantReportRowData = z.infer<typeof ParticipantReportRowSchema>;
export type ParticipantReportData = z.infer<typeof ParticipantReportSchema>;
export type AttendanceByActivityRowData = z.infer<typeof AttendanceByActivityRowSchema>;
export type AttendanceByActivityReportData = z.infer<typeof AttendanceByActivityReportSchema>;
export type WorkshopReservationRowData = z.infer<typeof WorkshopReservationRowSchema>;
export type WorkshopReservationReportData = z.infer<typeof WorkshopReservationReportSchema>;
export type EarningsByCongressRowData = z.infer<typeof EarningsByCongressRowSchema>;
export type EarningsByCongressReportData = z.infer<typeof EarningsByCongressReportSchema>;
export type EarningsRowData = z.infer<typeof EarningsRowSchema>;
export type EarningsReportData = z.infer<typeof EarningsReportSchema>;
export type CongressesByInstitutionRowData = z.infer<typeof CongressesByInstitutionRowSchema>;
export type CongressesByInstitutionReportData = z.infer<typeof CongressesByInstitutionReportSchema>;
