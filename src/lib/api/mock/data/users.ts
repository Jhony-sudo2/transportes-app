// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-iam.ts wrapper.

import type { UserData } from "@/lib/validators/user";

export const MOCK_PARTICIPANT_ID = "00000000-0000-0000-0000-000000000001";
export const MOCK_CONGRESS_ADMIN_ID = "00000000-0000-0000-0000-000000000002";
export const MOCK_SYSTEM_ADMIN_ID = "00000000-0000-0000-0000-000000000003";
export const MOCK_GUEST_SPEAKER_ID = "00000000-0000-0000-0000-000000000004";
export const MOCK_PARTICIPANT_2_ID = "00000000-0000-0000-0000-000000000005";
export const MOCK_PARTICIPANT_3_ID = "00000000-0000-0000-0000-000000000006";
export const MOCK_PARTICIPANT_4_ID = "00000000-0000-0000-0000-000000000007";

import { MOCK_INSTITUTION_1_ID } from "./institutions";

export const MOCK_USERS: UserData[] = [
  {
    id: MOCK_PARTICIPANT_ID,
    email: "participante@usac.edu.gt",
    fullName: "Carlos Lopez",
    organization: "Universidad de San Carlos",
    phone: "55551234",
    personalId: "12345678",
    photoUrl: null,
    active: true,
    roles: ["PARTICIPANT"],
    linkedInstitutions: [],

    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-01-10T08:00:00Z",
  },
  {
    id: MOCK_CONGRESS_ADMIN_ID,
    email: "admin@usac.edu.gt",
    fullName: "Maria Gonzalez",
    organization: "Universidad de San Carlos",
    phone: "55559876",
    personalId: "98765432",
    photoUrl: null,
    active: true,
    roles: ["CONGRESS_ADMIN", "PARTICIPANT"],
    linkedInstitutions: [MOCK_INSTITUTION_1_ID],

    createdAt: "2026-01-05T08:00:00Z",
    updatedAt: "2026-01-05T08:00:00Z",
  },
  {
    id: MOCK_SYSTEM_ADMIN_ID,
    email: "sysadmin@codenbugs.com",
    fullName: "Roberto Mendez",
    organization: "Code n Bugs",
    phone: "55550001",
    personalId: "11111111",
    photoUrl: null,
    active: true,
    roles: ["SYSTEM_ADMIN", "PARTICIPANT"],
    linkedInstitutions: [],

    createdAt: "2025-12-01T08:00:00Z",
    updatedAt: "2025-12-01T08:00:00Z",
  },
  {
    id: MOCK_GUEST_SPEAKER_ID,
    email: "ponente@externo.com",
    fullName: "Dr. Luis Ramirez",
    organization: "Instituto Tecnologico",
    phone: "55550002",
    personalId: "ABCD1234",
    photoUrl: null,
    active: true,
    roles: ["GUEST_SPEAKER"],
    linkedInstitutions: [],

    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-01T08:00:00Z",
  },
  {
    id: MOCK_PARTICIPANT_2_ID,
    email: "ana@usac.edu.gt",
    fullName: "Ana Martinez",
    organization: "Universidad de San Carlos",
    phone: "55550003",
    personalId: "87654321",
    photoUrl: null,
    active: true,
    roles: ["PARTICIPANT"],
    linkedInstitutions: [],

    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-01-15T08:00:00Z",
  },
  {
    id: MOCK_PARTICIPANT_3_ID,
    email: "inactivo@usac.edu.gt",
    fullName: "Pedro Inactivo",
    organization: "Universidad de San Carlos",
    phone: "55550004",
    personalId: "22222222",
    photoUrl: null,
    active: false,
    roles: ["PARTICIPANT"],
    linkedInstitutions: [],

    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: MOCK_PARTICIPANT_4_ID,
    email: "sinfondos@usac.edu.gt",
    fullName: "Juan Sin Fondos",
    organization: "Universidad de San Carlos",
    phone: "55550005",
    personalId: "33333333",
    photoUrl: null,
    active: true,
    roles: ["PARTICIPANT"],
    linkedInstitutions: [],

    createdAt: "2026-02-10T08:00:00Z",
    updatedAt: "2026-02-10T08:00:00Z",
  },
];
