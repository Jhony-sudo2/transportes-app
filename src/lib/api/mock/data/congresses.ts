// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { CongressData } from "@/lib/validators/congress";
import { MOCK_INSTITUTION_1_ID, MOCK_INSTITUTION_2_ID } from "./institutions";
import { MOCK_CONGRESS_ADMIN_ID } from "./users";

export const MOCK_CONGRESS_1_ID = "20000000-0000-0000-0000-000000000001";
export const MOCK_CONGRESS_2_ID = "20000000-0000-0000-0000-000000000002";
export const MOCK_CONGRESS_3_ID = "20000000-0000-0000-0000-000000000003";

export const MOCK_CONGRESSES: CongressData[] = [
  {
    id: MOCK_CONGRESS_1_ID,
    name: "Congreso de Ingenieria de Software 2026",
    description:
      "El congreso anual de ingenieria de software reune a expertos y estudiantes para compartir avances en desarrollo, arquitectura y practicas modernas.",
    startDate: "2026-07-15",
    endDate: "2026-07-17",
    location: "Campus Central USAC, Ciudad de Guatemala",
    price: 150,
    institutionId: MOCK_INSTITUTION_1_ID,
    institutionName: "Universidad de San Carlos",
    createdBy: MOCK_CONGRESS_ADMIN_ID,
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-05-01T08:00:00Z",
  },
  {
    id: MOCK_CONGRESS_2_ID,
    name: "Seminario de Ciencias de la Computacion",
    description:
      "Seminario enfocado en tendencias actuales de ciencias de la computacion, algoritmos y computacion de alto rendimiento.",
    startDate: "2026-08-10",
    endDate: "2026-08-11",
    location: "Facultad de Ingenieria, USAC",
    price: 75,
    institutionId: MOCK_INSTITUTION_1_ID,
    institutionName: "Universidad de San Carlos",
    createdBy: MOCK_CONGRESS_ADMIN_ID,
    createdAt: "2026-05-15T08:00:00Z",
    updatedAt: "2026-05-15T08:00:00Z",
  },
  {
    id: MOCK_CONGRESS_3_ID,
    name: "Forum de Inteligencia Artificial",
    description:
      "Espacio de dialogo sobre los avances, aplicaciones y retos eticos de la inteligencia artificial en Centroamerica.",
    startDate: "2026-09-05",
    endDate: "2026-09-06",
    location: "Centro de Convenios ITCA, Ciudad de Guatemala",
    price: 200,
    institutionId: MOCK_INSTITUTION_2_ID,
    institutionName: "Instituto Tecnologico Centroamericano",
    createdBy: MOCK_CONGRESS_ADMIN_ID,
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-01T08:00:00Z",
  },
];
