// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type {
  ParticipantReportData,
  AttendanceByActivityReportData,
  WorkshopReservationReportData,
  EarningsByCongressReportData,
  EarningsReportData,
  CongressesByInstitutionReportData,
} from "@/lib/validators/reports";
import {
  MOCK_ACTIVITY_1_ID,
  MOCK_ACTIVITY_2_ID,
  MOCK_ACTIVITY_3_ID,
  MOCK_ACTIVITY_4_ID,
} from "./activities";
import {
  MOCK_CONGRESS_1_ID,
  MOCK_CONGRESS_2_ID,
  MOCK_CONGRESS_3_ID,
} from "./congresses";
import { MOCK_INSTITUTION_1_ID, MOCK_INSTITUTION_2_ID } from "./institutions";

export const MOCK_PARTICIPANT_REPORT: ParticipantReportData = {
  items: [
    {
      personalId: "12345678",
      fullName: "Carlos Lopez",
      organization: "Universidad de San Carlos",
      email: "carlos@usac.edu.gt",
      phone: "+502 1234-5678",
      participationTypes: ["ATTENDEE", "WORKSHOP_LEADER"],
    },
    {
      personalId: "87654321",
      fullName: "Ana Martinez",
      organization: "Instituto Tecnologico Centroamericano",
      email: "ana@usac.edu.gt",
      phone: "+502 8765-4321",
      participationTypes: ["ATTENDEE", "SPEAKER"],
    },
  ],
  totalItems: 2,
};

export const MOCK_ATTENDANCE_BY_ACTIVITY_REPORT: AttendanceByActivityReportData =
  {
    items: [
      {
        activityId: MOCK_ACTIVITY_1_ID,
        activityName: "Arquitectura de Microservicios",
        roomName: "Auditorio Principal",
        startTime: "2026-07-15T09:00:00Z",
        endTime: "2026-07-15T10:30:00Z",
        attendanceCount: 2,
      },
      {
        activityId: MOCK_ACTIVITY_2_ID,
        activityName: "Docker y Kubernetes Practico",
        roomName: "Sala de Talleres A",
        startTime: "2026-07-15T11:00:00Z",
        endTime: "2026-07-15T13:00:00Z",
        attendanceCount: 1,
      },
      {
        activityId: MOCK_ACTIVITY_3_ID,
        activityName: "Taller de Machine Learning",
        roomName: "Sala de Conferencias B",
        startTime: "2026-07-15T14:00:00Z",
        endTime: "2026-07-15T16:00:00Z",
        attendanceCount: 1,
      },
      {
        activityId: MOCK_ACTIVITY_4_ID,
        activityName: "Seguridad en Aplicaciones Web",
        roomName: "Sala de Conferencias B",
        startTime: "2026-07-16T09:00:00Z",
        endTime: "2026-07-16T10:30:00Z",
        attendanceCount: 1,
      },
    ],
    totalItems: 4,
  };

export const MOCK_WORKSHOP_RESERVATION_REPORT: WorkshopReservationReportData =
  {
    items: [
      {
        activityId: MOCK_ACTIVITY_2_ID,
        activityName: "Docker y Kubernetes Practico",
        workshopCapacity: 20,
        reservationCount: 1,
        availableSeats: 19,
        roster: [
          {
            personalId: "12345678",
            fullName: "Carlos Lopez",
            email: "carlos@usac.edu.gt",
            participationType: "ATTENDEE",
          },
        ],
      },
      {
        activityId: MOCK_ACTIVITY_3_ID,
        activityName: "Taller de Machine Learning",
        workshopCapacity: 5,
        reservationCount: 5,
        availableSeats: 0,
        roster: [
          {
            personalId: "87654321",
            fullName: "Ana Martinez",
            email: "ana@usac.edu.gt",
            participationType: "ATTENDEE",
          },
        ],
      },
    ],
    totalItems: 2,
  };

export const MOCK_EARNINGS_BY_CONGRESS_REPORT: EarningsByCongressReportData = {
  items: [
    {
      congressId: MOCK_CONGRESS_1_ID,
      congressName: "Congreso Internacional de Tecnologia 2026",
      totalAmount: 150,
      commissionAmount: 15,
      netAmount: 135,
      paymentCount: 1,
    },
  ],
  totalItems: 1,
  grandTotal: 150,
};

export const MOCK_PLATFORM_EARNINGS_REPORT: EarningsReportData = {
  items: [
    {
      institutionId: MOCK_INSTITUTION_1_ID,
      institutionName: "Universidad de San Carlos",
      congresses: [
        {
          congressId: MOCK_CONGRESS_1_ID,
          congressName: "Congreso Internacional de Tecnologia 2026",
          totalAmount: 150,
          commissionAmount: 15,
          netAmount: 135,
        },
        {
          congressId: MOCK_CONGRESS_2_ID,
          congressName: "Simposio de Innovacion Digital",
          totalAmount: 0,
          commissionAmount: 0,
          netAmount: 0,
        },
      ],
      institutionTotalAmount: 150,
      institutionTotalCommission: 15,
      institutionTotalNet: 135,
    },
    {
      institutionId: MOCK_INSTITUTION_2_ID,
      institutionName: "Instituto Tecnologico Centroamericano",
      congresses: [
        {
          congressId: MOCK_CONGRESS_3_ID,
          congressName: "Congreso de Ciencias de la Computacion",
          totalAmount: 0,
          commissionAmount: 0,
          netAmount: 0,
        },
      ],
      institutionTotalAmount: 0,
      institutionTotalCommission: 0,
      institutionTotalNet: 0,
    },
  ],
  grandTotalAmount: 150,
  grandTotalCommission: 15,
  grandTotalNet: 135,
};

export const MOCK_CONGRESSES_BY_INSTITUTION_REPORT: CongressesByInstitutionReportData =
  {
    items: [
      {
        institutionId: MOCK_INSTITUTION_1_ID,
        institutionName: "Universidad de San Carlos",
        congressId: MOCK_CONGRESS_1_ID,
        congressName: "Congreso Internacional de Tecnologia 2026",
        startDate: "2026-07-15",
        endDate: "2026-07-17",
        location: "Ciudad de Guatemala, Guatemala",
        price: 150,
      },
      {
        institutionId: MOCK_INSTITUTION_1_ID,
        institutionName: "Universidad de San Carlos",
        congressId: MOCK_CONGRESS_2_ID,
        congressName: "Simposio de Innovacion Digital",
        startDate: "2026-08-10",
        endDate: "2026-08-12",
        location: "Quetzaltenango, Guatemala",
        price: 75,
      },
      {
        institutionId: MOCK_INSTITUTION_2_ID,
        institutionName: "Instituto Tecnologico Centroamericano",
        congressId: MOCK_CONGRESS_3_ID,
        congressName: "Congreso de Ciencias de la Computacion",
        startDate: "2026-09-05",
        endDate: "2026-09-07",
        location: "Antigua Guatemala, Guatemala",
        price: 200,
      },
    ],
    totalItems: 3,
  };
