// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { CallData } from "@/lib/validators/call";
import { MOCK_CONGRESS_1_ID } from "./congresses";

export const MOCK_CALL_1_ID = "50000000-0000-0000-0000-000000000001";

export const MOCK_CALLS: CallData[] = [
  {
    id: MOCK_CALL_1_ID,
    congressId: MOCK_CONGRESS_1_ID,
    status: "OPEN",
    openedAt: "2026-06-01T00:00:00Z",
    closedAt: null,
  },
];
