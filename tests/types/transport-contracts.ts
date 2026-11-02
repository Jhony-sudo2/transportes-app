import type { z } from "zod";
import type { TransportUser, TransportLoginRequest, TransportRegisterRequest } from "@/types/auth";
import type { Branch, CreateBranch, Coordinate, ManagedBranchContext } from "@/types/branch";
import type { AdminUser, AdminRole, CreatedAdminUser, CreateAdminUser } from "@/types/admin-user";
import type {
  BusFormData,
  CreatedBus,
  BusListRecord,
  DriverFormData,
  CreatedDriver,
  DriverListRecord,
  DriverOperation,
  BusType,
  BusTypeInput,
} from "@/types/fleet";
import type {
  AccountProfile,
  AccountProfileRequest,
  AccountPasswordRequest,
} from "@/types/account";
import type * as auth from "@/lib/validators/auth";
import type * as branch from "@/lib/validators/branch";
import type * as context from "@/lib/validators/branch-context";
import type * as admin from "@/lib/validators/admin-user";
import type * as fleet from "@/lib/validators/fleet-resources";
import type * as busType from "@/lib/validators/bus-type";
import type * as account from "@/lib/validators/account";
import type * as journey from "@/lib/validators/journey";
import type {
  RegularRoute,
  RegularRouteInput,
  TripScheduleInput,
  TripRecord,
  TripDeparture,
  TripArrival,
  TripOffer,
  JourneyWorkspace,
  TripDriverUpdate,
  TripCancellationInput,
  TripCancellationResult,
} from "@/types/journey";
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
// TypeScript comprueba que interfaces y validadores permanezcan compatibles en ambos sentidos.
export type TransportContractChecks = [
  Assert<Equal<RegularRoute, z.output<typeof journey.RegularRouteSchema>>>,
  Assert<Equal<RegularRouteInput, z.output<typeof journey.RegularRouteInputSchema>>>,
  Assert<Equal<TripScheduleInput, z.output<typeof journey.TripScheduleInputSchema>>>,
  Assert<Equal<TripRecord, z.output<typeof journey.TripRecordSchema>>>,
  Assert<Equal<TripDeparture, z.output<typeof journey.TripDepartureSchema>>>,
  Assert<Equal<TripArrival, z.output<typeof journey.TripArrivalSchema>>>,
  Assert<Equal<TripDriverUpdate, z.output<typeof journey.TripDriverUpdateSchema>>>,
  Assert<Equal<TripCancellationInput, z.output<typeof journey.TripCancellationSchema>>>,
  Assert<Equal<TripCancellationResult, z.output<typeof journey.TripCancellationResultSchema>>>,
  Assert<Equal<TripOffer, z.output<typeof journey.TripOfferSchema>>>,
  Assert<Equal<JourneyWorkspace, z.output<typeof journey.JourneyWorkspaceSchema>>>,
  Assert<Equal<TransportUser, z.output<typeof auth.TransportUserSchema>>>,
  Assert<Equal<TransportLoginRequest, z.output<typeof auth.TransportLoginRequestSchema>>>,
  Assert<Equal<TransportRegisterRequest, z.output<typeof auth.TransportRegisterRequestSchema>>>,
  Assert<Equal<Branch, z.output<typeof branch.BranchSchema>>>,
  Assert<Equal<CreateBranch, z.output<typeof branch.CreateBranchSchema>>>,
  Assert<Equal<Coordinate, z.output<typeof branch.CoordinateSchema>>>,
  Assert<Equal<ManagedBranchContext, z.output<typeof context.ManagedBranchContextSchema>>>,
  Assert<Equal<AdminUser, z.output<typeof admin.AdminUserSchema>>>,
  Assert<Equal<CreatedAdminUser, z.output<typeof admin.CreatedAdminUserSchema>>>,
  Assert<Equal<AdminRole, z.output<typeof admin.AdminRoleSchema>>>,
  Assert<Equal<CreateAdminUser, z.output<typeof admin.CreateAdminUserSchema>>>,
  Assert<Equal<BusFormData, z.output<typeof fleet.BusFormSchema>>>,
  Assert<Equal<CreatedBus, z.output<typeof fleet.CreatedBusSchema>>>,
  Assert<Equal<BusListRecord, z.output<typeof fleet.BusListRecordSchema>>>,
  Assert<Equal<DriverFormData, z.output<typeof fleet.CreateDriverSchema>>>,
  Assert<Equal<CreatedDriver, z.output<typeof fleet.CreatedDriverSchema>>>,
  Assert<Equal<DriverListRecord, z.output<typeof fleet.DriverListRecordSchema>>>,
  Assert<Equal<DriverOperation, z.output<typeof fleet.DriverOperationSchema>>>,
  Assert<Equal<BusType, z.output<typeof busType.BusTypeSchema>>>,
  Assert<Equal<BusTypeInput, z.output<typeof busType.BusTypeInputSchema>>>,
  Assert<Equal<AccountProfile, z.output<typeof account.AccountProfileSchema>>>,
  Assert<Equal<AccountProfileRequest, z.output<typeof account.AccountProfileRequestSchema>>>,
  Assert<Equal<AccountPasswordRequest, z.output<typeof account.AccountPasswordRequestSchema>>>,
];
