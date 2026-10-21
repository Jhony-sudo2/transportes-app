// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { ReservationData } from "@/lib/validators/reservation";
import { MOCK_ACTIVITY_2_ID, MOCK_ACTIVITY_FULL_ID } from "./activities";
import { MOCK_PARTICIPANT_ID, MOCK_PARTICIPANT_2_ID } from "./users";

export const MOCK_RESERVATION_1_ID = "80000000-0000-0000-0000-000000000001";
export const MOCK_RESERVATION_2_ID = "80000000-0000-0000-0000-000000000002";

export const MOCK_RESERVATIONS: ReservationData[] = [
  {
    id: MOCK_RESERVATION_1_ID,
    activityId: MOCK_ACTIVITY_2_ID,
    userId: MOCK_PARTICIPANT_ID,
    reservedAt: "2026-06-15T10:30:00Z",
  },
  {
    id: MOCK_RESERVATION_2_ID,
    activityId: MOCK_ACTIVITY_FULL_ID,
    userId: MOCK_PARTICIPANT_2_ID,
    reservedAt: "2026-06-20T09:00:00Z",
  },
];
