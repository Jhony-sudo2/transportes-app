// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { CommitteeMemberData } from "@/lib/validators/committee";
import { MOCK_CONGRESS_1_ID } from "./congresses";
import { MOCK_PARTICIPANT_2_ID } from "./users";

export const MOCK_COMMITTEE_MEMBERS: CommitteeMemberData[] = [
  {
    congressId: MOCK_CONGRESS_1_ID,
    userId: MOCK_PARTICIPANT_2_ID,
    fullName: "Ana Martinez",
    email: "ana@usac.edu.gt",
    addedAt: "2026-06-01T00:00:00Z",
  },
];
