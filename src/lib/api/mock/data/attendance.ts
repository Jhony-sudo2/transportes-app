// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { AttendanceData } from "@/lib/validators/attendance";
import {
  MOCK_ACTIVITY_1_ID,
  MOCK_ACTIVITY_2_ID,
  MOCK_ACTIVITY_3_ID,
  MOCK_ACTIVITY_4_ID,
} from "./activities";
import { MOCK_CONGRESS_ADMIN_ID } from "./users";

export const MOCK_ATTENDANCE: AttendanceData[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    activityId: MOCK_ACTIVITY_1_ID,
    personalId: "12345678",
    registeredBy: MOCK_CONGRESS_ADMIN_ID,
    registeredAt: "2026-07-15T09:05:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    activityId: MOCK_ACTIVITY_2_ID,
    personalId: "12345678",
    registeredBy: MOCK_CONGRESS_ADMIN_ID,
    registeredAt: "2026-07-15T11:05:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    activityId: MOCK_ACTIVITY_4_ID,
    personalId: "12345678",
    registeredBy: MOCK_CONGRESS_ADMIN_ID,
    registeredAt: "2026-07-16T09:05:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    activityId: MOCK_ACTIVITY_3_ID,
    personalId: "87654321",
    registeredBy: MOCK_CONGRESS_ADMIN_ID,
    registeredAt: "2026-07-15T14:05:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000005",
    activityId: MOCK_ACTIVITY_1_ID,
    personalId: "87654321",
    registeredBy: MOCK_CONGRESS_ADMIN_ID,
    registeredAt: "2026-07-15T09:10:00Z",
  },
];
