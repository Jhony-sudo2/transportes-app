// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { EnrollmentData } from "@/lib/validators/enrollment";
import { MOCK_CONGRESS_1_ID } from "./congresses";
import { MOCK_PARTICIPANT_ID } from "./users";

export const MOCK_ENROLLMENT_1_ID = "70000000-0000-0000-0000-000000000001";
export const MOCK_PAYMENT_1_ID = "a0000000-0000-0000-0000-000000000001";

export const MOCK_ENROLLMENTS: EnrollmentData[] = [
  {
    id: MOCK_ENROLLMENT_1_ID,
    congressId: MOCK_CONGRESS_1_ID,
    userId: MOCK_PARTICIPANT_ID,
    paymentId: MOCK_PAYMENT_1_ID,
    enrolledAt: "2026-06-15T10:00:00Z",
    paymentDate: "2026-06-15",
  },
];
