// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { DiplomaData } from "@/lib/validators/diploma";
import { MOCK_ACTIVITY_2_ID } from "./activities";
import { MOCK_CONGRESS_1_ID } from "./congresses";
import { MOCK_PARTICIPANT_ID } from "./users";

export const MOCK_DIPLOMA_1_ID = "90000000-0000-0000-0000-000000000001";
export const MOCK_DIPLOMA_2_ID = "90000000-0000-0000-0000-000000000002";

export const MOCK_DIPLOMAS: DiplomaData[] = [
  {
    id: MOCK_DIPLOMA_1_ID,
    userId: MOCK_PARTICIPANT_ID,
    congressId: MOCK_CONGRESS_1_ID,
    type: "PARTICIPATION",
    activityId: null,
    issuedAt: "2026-07-16T18:00:00Z",
    congressName: "Congreso Internacional de Tecnologia 2026",
    activityName: null,
    available: true,
  },
  {
    id: MOCK_DIPLOMA_2_ID,
    userId: MOCK_PARTICIPANT_ID,
    congressId: MOCK_CONGRESS_1_ID,
    type: "LEADERSHIP",
    activityId: MOCK_ACTIVITY_2_ID,
    issuedAt: "2026-07-16T18:00:00Z",
    congressName: "Congreso Internacional de Tecnologia 2026",
    activityName: "Docker y Kubernetes Practico",
    available: true,
  },
];
