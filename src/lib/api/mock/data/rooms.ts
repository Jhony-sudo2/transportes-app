// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { RoomData } from "@/lib/validators/room";
import { MOCK_CONGRESS_1_ID } from "./congresses";

export const MOCK_ROOM_1_ID = "30000000-0000-0000-0000-000000000001";
export const MOCK_ROOM_2_ID = "30000000-0000-0000-0000-000000000002";
export const MOCK_ROOM_3_ID = "30000000-0000-0000-0000-000000000003";

export const MOCK_ROOMS: RoomData[] = [
  {
    id: MOCK_ROOM_1_ID,
    congressId: MOCK_CONGRESS_1_ID,
    name: "Auditorio Principal",
    capacity: null,
    location: null,
    createdAt: "2026-05-02T08:00:00Z",
    updatedAt: "2026-05-02T08:00:00Z",
  },
  {
    id: MOCK_ROOM_2_ID,
    congressId: MOCK_CONGRESS_1_ID,
    name: "Sala de Talleres A",
    capacity: 25,
    location: "Edificio B, Planta 1",
    createdAt: "2026-05-02T08:00:00Z",
    updatedAt: "2026-05-02T08:00:00Z",
  },
  {
    id: MOCK_ROOM_3_ID,
    congressId: MOCK_CONGRESS_1_ID,
    name: "Sala de Conferencias B",
    capacity: 60,
    location: "Edificio A, Planta 2",
    createdAt: "2026-05-02T08:00:00Z",
    updatedAt: "2026-05-02T08:00:00Z",
  },
];
