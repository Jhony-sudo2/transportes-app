// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import { ApplicationError } from "@/types/error";
import type { InstitutionData, InstitutionListData } from "@/lib/validators/institution";
import type { CongressData, CongressListData } from "@/lib/validators/congress";
import type { RoomData, RoomListData } from "@/lib/validators/room";
import type { ActivityData, ActivityListData } from "@/lib/validators/activity";
import type { ProposalData, ProposalListData } from "@/lib/validators/proposal";
import type { EnrollmentData, EnrollmentListData } from "@/lib/validators/enrollment";
import type { ReservationData, ReservationListData } from "@/lib/validators/reservation";
import type { AttendanceData, AttendanceListData } from "@/lib/validators/attendance";
// AttendanceData[] is the return type of getUserAttendance — no extra import needed
import type { CallData, CallListData } from "@/lib/validators/call";
import type { CommitteeMemberData, CommitteeMemberListData } from "@/lib/validators/committee";
import type { DiplomaData, DiplomaListData, DiplomaPrintData } from "@/lib/validators/diploma";
import type {
  ParticipantReportData,
  AttendanceByActivityReportData,
  WorkshopReservationReportData,
  EarningsByCongressReportData,
  EarningsReportData,
  CongressesByInstitutionReportData,
} from "@/lib/validators/reports";
import { MOCK_INSTITUTIONS } from "./data/institutions";
import { MOCK_CONGRESSES } from "./data/congresses";
import { MOCK_ROOMS } from "./data/rooms";
import { MOCK_ACTIVITIES } from "./data/activities";
import { MOCK_PROPOSALS } from "./data/proposals";
import { MOCK_ENROLLMENTS } from "./data/enrollments";
import { MOCK_RESERVATIONS } from "./data/reservations";
import { MOCK_ATTENDANCE } from "./data/attendance";
import { MOCK_USERS } from "./data/users";
import { MOCK_CALLS } from "./data/calls";
import { MOCK_COMMITTEE_MEMBERS } from "./data/committee";
import { MOCK_DIPLOMAS } from "./data/diplomas";
import {
  MOCK_PARTICIPANT_REPORT,
  MOCK_ATTENDANCE_BY_ACTIVITY_REPORT,
  MOCK_WORKSHOP_RESERVATION_REPORT,
  MOCK_EARNINGS_BY_CONGRESS_REPORT,
  MOCK_PLATFORM_EARNINGS_REPORT,
  MOCK_CONGRESSES_BY_INSTITUTION_REPORT,
} from "./data/reports";

const MOCK_DELAY = 200;

async function delay(): Promise<void> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
}

// --- Institutions ---

export async function listInstitutions(
  _params: URLSearchParams,
): Promise<InstitutionListData> {
  await delay();
  return {
    items: MOCK_INSTITUTIONS,
    totalItems: MOCK_INSTITUTIONS.length,
    totalPages: 1,
  };
}

export async function getInstitution(id: string): Promise<InstitutionData> {
  await delay();
  const item = MOCK_INSTITUTIONS.find((i) => i.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function createInstitution(
  _data: unknown,
  _token: string,
): Promise<InstitutionData> {
  await delay();
  const item = MOCK_INSTITUTIONS[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function updateInstitution(
  id: string,
  _data: unknown,
  _token: string,
): Promise<InstitutionData> {
  await delay();
  const item = MOCK_INSTITUTIONS.find((i) => i.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function deleteInstitution(
  _id: string,
  _token: string,
): Promise<void> {
  await delay();
}

// --- Congresses ---

export async function listCongresses(
  _params: URLSearchParams,
): Promise<CongressListData> {
  await delay();
  return {
    items: MOCK_CONGRESSES,
    totalItems: MOCK_CONGRESSES.length,
    totalPages: 1,
  };
}

export async function getCongress(id: string): Promise<CongressData> {
  await delay();
  const item = MOCK_CONGRESSES.find((c) => c.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function createCongress(
  _data: unknown,
  _token: string,
): Promise<CongressData> {
  await delay();
  const item = MOCK_CONGRESSES[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function updateCongress(
  id: string,
  _data: unknown,
  _token: string,
): Promise<CongressData> {
  await delay();
  const item = MOCK_CONGRESSES.find((c) => c.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function deleteCongress(_id: string, _token: string): Promise<void> {
  await delay();
}

// --- Rooms ---

export async function listRooms(
  congressId: string,
  _params: URLSearchParams,
): Promise<RoomListData> {
  await delay();
  const items = MOCK_ROOMS.filter((r) => r.congressId === congressId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getRoom(id: string): Promise<RoomData> {
  await delay();
  const item = MOCK_ROOMS.find((r) => r.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function createRoom(
  congressId: string,
  _data: unknown,
  _token: string,
): Promise<RoomData> {
  await delay();
  const item = MOCK_ROOMS.find((r) => r.congressId === congressId);
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function updateRoom(
  id: string,
  _data: unknown,
  _token: string,
): Promise<RoomData> {
  await delay();
  const item = MOCK_ROOMS.find((r) => r.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function deleteRoom(id: string, _token: string): Promise<void> {
  await delay();
  const hasActivities = MOCK_ACTIVITIES.some((a) => a.roomId === id);
  if (hasActivities) {
    throw new ApplicationError(
      "resource.conflict",
      409,
      "La sala tiene actividades asociadas y no puede eliminarse",
    );
  }
}

// --- Activities ---

export async function listActivities(
  congressId: string,
  params: URLSearchParams,
): Promise<ActivityListData> {
  await delay();
  let items = MOCK_ACTIVITIES.filter((a) => a.congressId === congressId);
  const type = params.get("type");
  if (type !== null) {
    items = items.filter((a) => a.type === type);
  }
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getActivity(id: string): Promise<ActivityData> {
  await delay();
  const item = MOCK_ACTIVITIES.find((a) => a.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function createActivity(
  congressId: string,
  _data: unknown,
  _token: string,
): Promise<ActivityData> {
  await delay();
  const item = MOCK_ACTIVITIES.find((a) => a.congressId === congressId);
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function updateActivity(
  id: string,
  _data: unknown,
  _token: string,
): Promise<ActivityData> {
  await delay();
  const item = MOCK_ACTIVITIES.find((a) => a.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function deleteActivity(_id: string, _token: string): Promise<void> {
  await delay();
}

// --- Proposals ---

export async function listProposals(
  callId: string,
  _token: string,
  _params: URLSearchParams,
): Promise<ProposalListData> {
  await delay();
  const items = MOCK_PROPOSALS.filter((p) => p.callId === callId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getUserProposals(
  userId: string,
  _token: string,
): Promise<ProposalListData> {
  await delay();
  const items = MOCK_PROPOSALS.filter((p) => p.authorUserId === userId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function createProposal(
  _callId: string,
  _data: unknown,
  _token: string,
): Promise<ProposalData> {
  await delay();
  const item = MOCK_PROPOSALS[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function approveProposal(
  id: string,
  _token: string,
): Promise<ProposalData> {
  await delay();
  const item = MOCK_PROPOSALS.find((p) => p.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return { ...item, status: "APPROVED" };
}

export async function rejectProposal(
  id: string,
  _token: string,
): Promise<ProposalData> {
  await delay();
  const item = MOCK_PROPOSALS.find((p) => p.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return { ...item, status: "REJECTED" };
}

// --- Enrollments ---

export async function enrollInCongress(
  _congressId: string,
  _data: unknown,
  _token: string,
  _idempotencyKey: string,
): Promise<EnrollmentData> {
  await delay();
  const item = MOCK_ENROLLMENTS[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function getUserEnrollments(
  userId: string,
  _token: string,
): Promise<EnrollmentListData> {
  await delay();
  const items = MOCK_ENROLLMENTS.filter((e) => e.userId === userId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getCongressEnrollments(
  congressId: string,
  _token: string,
): Promise<EnrollmentListData> {
  await delay();
  const items = MOCK_ENROLLMENTS.filter((e) => e.congressId === congressId);
  return { items, totalItems: items.length, totalPages: 1 };
}

// --- Reservations ---

export async function reserveActivity(
  activityId: string,
  _token: string,
): Promise<ReservationData> {
  await delay();
  const activity = MOCK_ACTIVITIES.find((a) => a.id === activityId);
  if (activity !== undefined && activity.workshopCapacity !== null) {
    const reservationCount = MOCK_RESERVATIONS.filter(
      (r) => r.activityId === activityId,
    ).length;
    if (reservationCount >= activity.workshopCapacity) {
      throw new ApplicationError(
        "resource.conflict",
        409,
        "La actividad ha alcanzado su capacidad maxima",
      );
    }
  }
  const item = MOCK_RESERVATIONS[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function getActivityReservations(
  activityId: string,
  _token: string,
): Promise<ReservationListData> {
  await delay();
  const items = MOCK_RESERVATIONS.filter((r) => r.activityId === activityId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getUserReservations(
  userId: string,
  _token: string,
): Promise<ReservationListData> {
  await delay();
  const items = MOCK_RESERVATIONS.filter((r) => r.userId === userId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function cancelReservation(
  _id: string,
  _token: string,
): Promise<void> {
  await delay();
}

// --- Attendance ---

export async function registerAttendance(
  data: unknown,
  _token: string,
): Promise<AttendanceData> {
  await delay();
  const body = data as { activityId?: string; personalId?: string };
  if (body.activityId !== undefined && body.personalId !== undefined) {
    const activity = MOCK_ACTIVITIES.find((a) => a.id === body.activityId);
    if (activity?.type === "TALLER") {
      const user = MOCK_USERS.find((u) => u.personalId === body.personalId);
      if (user !== undefined) {
        const hasReservation = MOCK_RESERVATIONS.some(
          (r) => r.activityId === body.activityId && r.userId === user.id,
        );
        if (!hasReservation) {
          throw new ApplicationError(
            "domain.invariant_violated",
            422,
            "Se requiere reserva previa para asistir a este taller",
          );
        }
      }
    }
  }
  const item = MOCK_ATTENDANCE[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function listAttendance(
  _token: string,
  params: URLSearchParams,
): Promise<AttendanceListData> {
  await delay();
  let items = [...MOCK_ATTENDANCE];
  const activityId = params.get("activityId");
  if (activityId !== null) {
    items = items.filter((a) => a.activityId === activityId);
  }
  const personalId = params.get("personalId");
  if (personalId !== null) {
    items = items.filter((a) => a.personalId === personalId);
  }
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getUserAttendance(
  _userId: string,
  _token: string,
): Promise<AttendanceData[]> {
  await delay();
  return MOCK_ATTENDANCE;
}

// --- Calls ---

export async function listCalls(
  congressId: string,
  _params: URLSearchParams,
): Promise<CallListData> {
  await delay();
  const items = MOCK_CALLS.filter((c) => c.congressId === congressId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function createCall(
  congressId: string,
  _token: string,
): Promise<CallData> {
  await delay();
  const item = MOCK_CALLS.find((c) => c.congressId === congressId);
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function closeCall(callId: string, _token: string): Promise<CallData> {
  await delay();
  const item = MOCK_CALLS.find((c) => c.id === callId);
  if (item === undefined) throw new Error("resource.not_found");
  return { ...item, status: "CLOSED", closedAt: new Date().toISOString() };
}

// --- Scientific Committee ---

export async function getCommitteeMembers(
  congressId: string,
  _token: string,
): Promise<CommitteeMemberListData> {
  await delay();
  const items = MOCK_COMMITTEE_MEMBERS.filter(
    (m) => m.congressId === congressId,
  );
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function addCommitteeMember(
  _congressId: string,
  _data: unknown,
  _token: string,
): Promise<CommitteeMemberData> {
  await delay();
  const item = MOCK_COMMITTEE_MEMBERS[0];
  if (item === undefined) throw new Error("system.internal_error");
  return item;
}

export async function removeCommitteeMember(
  _congressId: string,
  _userId: string,
  _token: string,
): Promise<void> {
  await delay();
}

// --- Diplomas ---

export async function getDiplomasByUser(
  userId: string,
  _token: string,
): Promise<DiplomaListData> {
  await delay();
  const items = MOCK_DIPLOMAS.filter((d) => d.userId === userId);
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function getDiploma(id: string, _token: string): Promise<DiplomaData> {
  await delay();
  const item = MOCK_DIPLOMAS.find((d) => d.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return item;
}

export async function getDiplomaPrintData(
  id: string,
  _token: string,
): Promise<DiplomaPrintData> {
  await delay();
  const item = MOCK_DIPLOMAS.find((d) => d.id === id);
  if (item === undefined) throw new Error("resource.not_found");
  return {
    diplomaId: item.id,
    userId: item.userId,
    userFullName: "Usuario de prueba",
    congressId: item.congressId,
    congressName: item.congressName,
    activityId: item.activityId,
    activityName: item.activityName,
    type: item.type,
    issuedAt: item.issuedAt,
  };
}

export async function downloadDiploma(
  _id: string,
  _token: string,
): Promise<ArrayBuffer> {
  await delay();
  return new ArrayBuffer(1);
}

// --- Reports (CongressAdmin) ---

export async function getParticipantReport(
  _token: string,
  _params: URLSearchParams,
): Promise<ParticipantReportData> {
  await delay();
  return MOCK_PARTICIPANT_REPORT;
}

export async function getAttendanceByActivityReport(
  _token: string,
  _params: URLSearchParams,
): Promise<AttendanceByActivityReportData> {
  await delay();
  return MOCK_ATTENDANCE_BY_ACTIVITY_REPORT;
}

export async function getWorkshopReservationReport(
  _token: string,
  _params: URLSearchParams,
): Promise<WorkshopReservationReportData> {
  await delay();
  return MOCK_WORKSHOP_RESERVATION_REPORT;
}

export async function getEarningsByCongressReport(
  _token: string,
  _params: URLSearchParams,
): Promise<EarningsByCongressReportData> {
  await delay();
  return MOCK_EARNINGS_BY_CONGRESS_REPORT;
}

// --- Reports (SystemAdmin) ---

export async function getPlatformEarningsReport(
  _token: string,
  _params: URLSearchParams,
): Promise<EarningsReportData> {
  await delay();
  return MOCK_PLATFORM_EARNINGS_REPORT;
}

export async function getCongressesByInstitutionReport(
  _token: string,
  _params: URLSearchParams,
): Promise<CongressesByInstitutionReportData> {
  await delay();
  return MOCK_CONGRESSES_BY_INSTITUTION_REPORT;
}
