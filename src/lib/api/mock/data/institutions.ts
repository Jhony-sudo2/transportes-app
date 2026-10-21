// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-conference.ts wrapper.

import type { InstitutionData } from "@/lib/validators/institution";

export const MOCK_INSTITUTION_1_ID = "10000000-0000-0000-0000-000000000001";
export const MOCK_INSTITUTION_2_ID = "10000000-0000-0000-0000-000000000002";

export const MOCK_INSTITUTIONS: InstitutionData[] = [
  {
    id: MOCK_INSTITUTION_1_ID,
    name: "Universidad de San Carlos",
    description: "La universidad nacional de Guatemala, fundada en 1676.",
    contactEmail: "contacto@usac.edu.gt",
    active: true,
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2025-12-01T00:00:00Z",
  },
  {
    id: MOCK_INSTITUTION_2_ID,
    name: "Instituto Tecnologico Centroamericano",
    description: "Centro de excelencia en tecnologia e innovacion.",
    contactEmail: "info@itca.edu.gt",
    active: true,
    createdAt: "2025-12-15T00:00:00Z",
    updatedAt: "2025-12-15T00:00:00Z",
  },
];
