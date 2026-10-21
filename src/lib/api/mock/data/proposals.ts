// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { ProposalData } from "@/lib/validators/proposal";
import { MOCK_CALL_1_ID } from "./calls";
import { MOCK_PARTICIPANT_ID, MOCK_PARTICIPANT_2_ID, MOCK_CONGRESS_ADMIN_ID } from "./users";

export const MOCK_PROPOSAL_1_ID = "60000000-0000-0000-0000-000000000001";
export const MOCK_PROPOSAL_2_ID = "60000000-0000-0000-0000-000000000002";
export const MOCK_PROPOSAL_3_ID = "60000000-0000-0000-0000-000000000003";

export const MOCK_PROPOSALS: ProposalData[] = [
  {
    id: MOCK_PROPOSAL_1_ID,
    callId: MOCK_CALL_1_ID,
    authorUserId: MOCK_PARTICIPANT_2_ID,
    title: "Propuesta de IA aplicada",
    description:
      "Exploracion de aplicaciones practicas de inteligencia artificial en el contexto educativo guatemalteco.",
    type: "PONENCIA",
    status: "PENDING",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-06-05T10:00:00Z",
  },
  {
    id: MOCK_PROPOSAL_2_ID,
    callId: MOCK_CALL_1_ID,
    authorUserId: MOCK_PARTICIPANT_ID,
    title: "Workshop de Testing",
    description:
      "Taller practico sobre estrategias de testing moderno: unitario, integracion y E2E con herramientas actuales.",
    type: "TALLER",
    status: "APPROVED",
    reviewedBy: MOCK_CONGRESS_ADMIN_ID,
    reviewedAt: "2026-06-10T10:00:00Z",
    createdAt: "2026-06-04T09:00:00Z",
  },
  {
    id: MOCK_PROPOSAL_3_ID,
    callId: MOCK_CALL_1_ID,
    authorUserId: MOCK_PARTICIPANT_ID,
    title: "Blockchain en la educacion",
    description:
      "Analisis del potencial de blockchain para certificaciones y credenciales academicas verificables.",
    type: "PONENCIA",
    status: "REJECTED",
    reviewedBy: MOCK_CONGRESS_ADMIN_ID,
    reviewedAt: "2026-06-10T11:00:00Z",
    createdAt: "2026-06-03T14:00:00Z",
  },
];
