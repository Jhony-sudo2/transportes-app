import { z } from "zod";
import { ManagedBranchIdSchema } from "./branch-context";
const required = z.string().trim().min(1, "Este campo es obligatorio");
const integer = z
  .number({ invalid_type_error: "Ingresa un número válido" })
  .int("Usa un número entero")
  .positive("Debe ser mayor que cero")
  .max(2147483647);
export const BusFormSchema = z.object({
  branchId: ManagedBranchIdSchema,
  plateNumber: required.max(255),
  brand: required.max(255),
  color: required.max(255),
  model: integer.min(1980, "El modelo debe ser de 1980 en adelante").max(9999),
  year_manufacture: integer.max(9999),
  seatRows: integer.max(30, "Se permiten hasta 30 filas"),
  seatColumns: integer.max(6, "Se permiten hasta 6 columnas"),
  currentKm: integer,
});
export const CreateBusSchema = BusFormSchema.transform((data) => ({
  ...data,
  capacity: data.seatRows * data.seatColumns,
}));
export const EditBusFormSchema = BusFormSchema.extend({
  color: required.max(30),
  plateNumber: required.max(20),
  brand: required.max(50),
  year_manufacture: integer.min(1980),
  currentKm: z.number().int().nonnegative().max(2147483647),
});
export const UpdateBusSchema = z
  .object({
    branchId: ManagedBranchIdSchema,
    color: EditBusFormSchema.shape.color,
    plateNumber: EditBusFormSchema.shape.plateNumber,
    brand: EditBusFormSchema.shape.brand,
    model: EditBusFormSchema.shape.model,
    yearManufacture: EditBusFormSchema.shape.year_manufacture,
    capacity: integer,
    seatRows: BusFormSchema.shape.seatRows,
    seatColumns: BusFormSchema.shape.seatColumns,
  })
  .strict();
export const CreatedBusSchema = z.object({
  id: ManagedBranchIdSchema,
  plateNumber: z.string(),
  brand: z.string(),
  model: z.union([z.string(), z.number()]).transform(String),
  yearManufacture: z.number().int(),
  capacity: integer,
  currentKm: integer,
  seatRows: integer.max(30),
  seatColumns: integer.max(6),
  state: z.string(),
  photo: z.string().nullish(),
  color: z.string().nullish(),
});
const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha válida")
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ingresa una fecha válida");
export const CreateDriverSchema = z.object({
  branchId: ManagedBranchIdSchema,
  name: required.max(255),
  lastName: required.max(255),
  dpi: required.max(50),
  nit: required.max(50),
  phone: required.max(20),
  email: z.string().trim().email("Ingresa un correo válido").max(255),
  adress: required.max(100),
  baseSalary: z
    .number({ invalid_type_error: "Ingresa un salario válido" })
    .finite()
    .positive("El salario debe ser mayor que cero"),
  license: z.object({
    number: required.max(255),
    expirationDate: localDate,
    licenseType: ManagedBranchIdSchema,
  }),
});
export const LicenseTypeListSchema = z.array(
  z.object({ id: ManagedBranchIdSchema, name: required }),
);
export const DriverOperationIdSchema = z.string().uuid("Identificador de operación inválido");
export const CreatedDriverSchema = z
  .object({
    id: ManagedBranchIdSchema,
    name: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "ACCOUNT_REJECTED"]),
    pendingOperationId: DriverOperationIdSchema.nullish(),
    failureReason: z.string().nullish(),
  })
  .refine(
    (driver) => driver.status !== "PENDING" || !!driver.pendingOperationId,
    "No se recibió la referencia del registro pendiente",
  );
export const DriverOperationSchema = z.object({
  operationId: DriverOperationIdSchema,
  driverId: ManagedBranchIdSchema,
  action: z.literal("CREATE"),
  status: z.enum(["PENDING", "COMPLETED", "REJECTED"]),
  failureReason: z.string().nullish(),
});
export const DriverOperationReferenceSchema = z.object({
  driverId: ManagedBranchIdSchema,
  operationId: DriverOperationIdSchema,
  branchId: ManagedBranchIdSchema,
});
export const BusListRecordSchema = CreatedBusSchema.extend({
  yearManufacture: z.number().int().nullish(),
  capacity: z.number().int().nonnegative().nullish(),
  currentKm: z.number().int().nonnegative().nullish(),
  seatRows: z.number().int().nonnegative().nullish(),
  seatColumns: z.number().int().nonnegative().nullish(),
  state: z.string().nullish(),
});
export const DriverListRecordSchema = CreatedDriverSchema.innerType().extend({
  userId: ManagedBranchIdSchema.nullish(),
  email: z.string().nullish(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "ACCOUNT_REJECTED"]).nullish(),
  pendingOperationId: z.string().nullish(),
  phone: z.string().nullish(),
  baseSalary: z.number().finite().nonnegative().nullish(),
  number: z.string().nullish(),
  expirationDate: z.string().nullish(),
  licenseTypeName: z.string().nullish(),
  licenseId: ManagedBranchIdSchema.nullish(),
  licenseTypeId: ManagedBranchIdSchema.nullish(),
  active: z.boolean().optional(),
});
export const FleetAvailabilityRequestSchema = z
  .object({
    branchId: ManagedBranchIdSchema,
    active: z.boolean(),
  })
  .strict();
export const DriverSalaryRequestSchema = z
  .object({
    branchId: ManagedBranchIdSchema,
    baseSalary: CreateDriverSchema.shape.baseSalary,
  })
  .strict();
export const DriverLicenseFormSchema = CreateDriverSchema.shape.license.strict();
export const DriverLicenseRequestSchema = z
  .object({
    branchId: ManagedBranchIdSchema,
    ...DriverLicenseFormSchema.shape,
  })
  .strict();
export const LicenseRecordSchema = z.object({
  id: ManagedBranchIdSchema,
  number: required.max(255),
  expirationDate: localDate,
  tipo: required,
});
export const DriverLicenseContextSchema = z.object({
  branchId: ManagedBranchIdSchema,
  license: DriverLicenseFormSchema,
  types: LicenseTypeListSchema,
});
export const BusListSchema = z.array(BusListRecordSchema);
export const DriverListSchema = z.array(DriverListRecordSchema);
export type BusListRecord = z.infer<typeof BusListRecordSchema>;
export type DriverListRecord = z.infer<typeof DriverListRecordSchema>;
export const MAX_DRIVER_PHOTO_BYTES = 1024 * 1024;
export function fleetPhotoError(photo: { size: number; type: string } | null): string | null {
  if (!photo || photo.size === 0) return "Selecciona una fotografía.";
  if (!["image/jpeg", "image/png"].includes(photo.type)) return "Usa una fotografía JPG o PNG.";
  return photo.size > MAX_DRIVER_PHOTO_BYTES ? "La fotografía debe pesar como máximo 1 MB." : null;
}
export const driverPhotoError = fleetPhotoError;
export type BusFormData = z.infer<typeof BusFormSchema>;
export type DriverFormData = z.infer<typeof CreateDriverSchema>;
export type CreatedBus = z.infer<typeof CreatedBusSchema>;
export type CreatedDriver = z.infer<typeof CreatedDriverSchema>;
export type DriverOperationReference = z.infer<typeof DriverOperationReferenceSchema>;
export type DriverOperation = z.infer<typeof DriverOperationSchema>;
