import { z } from "zod";
import type { Branch, Coordinate } from "@/types/branch";
export const LatitudeSchema = z
  .number({ invalid_type_error: "Selecciona una ubicación válida" })
  .finite()
  .min(-90, "Latitud fuera de rango")
  .max(90, "Latitud fuera de rango");
export const LongitudeSchema = z
  .number({ invalid_type_error: "Selecciona una ubicación válida" })
  .finite()
  .min(-180, "Longitud fuera de rango")
  .max(180, "Longitud fuera de rango");
export const CoordinateSchema = z.object({ latitude: LatitudeSchema, longitude: LongitudeSchema });
const text = z.string().trim().min(1, "Este campo es obligatorio");
export const CreateBranchSchema = z.object({
  name: text.max(150),
  phone: text.max(20),
  direction: z.object({
    municipalityId: z
      .number({ invalid_type_error: "Selecciona un municipio" })
      .int()
      .positive("Selecciona un municipio"),
    latitude: LatitudeSchema,
    longitude: LongitudeSchema,
    indication: z.string().trim().max(255).optional(),
  }),
});
export const UpdateBranchSchema = CreateBranchSchema;
const BranchRecordSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  phone: z.string().nullish(),
  latitude: z.number().finite().nullish(),
  longitude: z.number().finite().nullish(),
  municipalityId: z.number().int().positive().nullish(),
  departamentId: z.number().int().positive().nullish(),
  municipalityName: z.string().nullish(),
  departamentName: z.string().nullish(),
  indication: z.string().nullish(),
  active: z.boolean().optional(),
});
export const BranchSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("branchId" in raw)) return raw;
  if ("id" in raw && raw.id !== raw.branchId) return null;
  return { ...raw, id: raw.branchId };
}, BranchRecordSchema);
export const BranchListSchema = z.array(BranchSchema);
export const BranchStatusResponseSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("branchId" in raw)) return raw;
    if ("id" in raw && raw.id !== raw.branchId) return null;
    return { ...raw, id: raw.branchId };
  },
  z.object({ id: z.number().int().positive().safe(), active: z.boolean() }).strip(),
);
export const LocationListSchema = z.array(
  z.object({ id: z.number().int().positive(), name: z.string() }),
);
export function getBranchCoordinate(branch: Branch): Coordinate | null {
  const result = CoordinateSchema.safeParse(branch);
  return result.success ? result.data : null;
}
export function roundCoordinate(point: Coordinate): Coordinate {
  return {
    latitude: Number(point.latitude.toFixed(7)),
    longitude: Number(point.longitude.toFixed(7)),
  };
}
