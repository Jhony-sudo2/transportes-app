// MOCK: Remove this file when backend is ready.
// Replace with real upstream calls via active-iam.ts wrapper.

import type {
  IamAuthResponseData,
  RefreshResponseData,
  LoginRequest,
  RegisterRequest,
} from "@/lib/validators/auth";
import { UpdateUserSchema } from "@/lib/validators/user";
import type { UserData, UserListData } from "@/lib/validators/user";
import {
  MOCK_USERS,
  MOCK_PARTICIPANT_ID,
  MOCK_SYSTEM_ADMIN_ID,
  MOCK_CONGRESS_ADMIN_ID,
  MOCK_GUEST_SPEAKER_ID,
} from "./data/users";

const MOCK_DELAY = 200;

async function delay(): Promise<void> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
}

function makeMockJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.mocksig`;
}

function makeMockAuthResponse(user: UserData): IamAuthResponseData {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    iat: now,
    exp: now + 86400 * 365,
  };
  const token = makeMockJwt(payload);
  return { accessToken: token, refreshToken: token, user };
}

function decodeTokenUserId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const raw: unknown = JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf-8"));
    if (typeof raw !== "object" || raw === null) return null;
    const userId = (raw as Record<string, unknown>)["userId"];
    return typeof userId === "string" ? userId : null;
  } catch {
    return null;
  }
}

// --- Auth ---

export async function loginUser(data: LoginRequest): Promise<IamAuthResponseData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.email === data.email);
  if (user === undefined || !user.active) {
    throw new Error("auth.invalid_credentials");
  }
  return makeMockAuthResponse(user);
}

// Signature matches real iam.ts — both tokens are accepted.
export async function logoutUser(_accessToken: string, _refreshToken: string): Promise<void> {
  await delay();
}

export async function refreshToken(token: string): Promise<RefreshResponseData> {
  await delay();
  const userId = decodeTokenUserId(token);
  const user = MOCK_USERS.find((u) => u.id === userId) ?? MOCK_USERS[0];
  if (user === undefined) throw new Error("auth.token_invalid");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    iat: now,
    exp: now + 86400 * 365,
  };
  return { accessToken: makeMockJwt(payload) };
}

// --- Users ---

export async function registerParticipant(_data: RegisterRequest): Promise<IamAuthResponseData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === MOCK_PARTICIPANT_ID);
  if (user === undefined) throw new Error("system.internal_error");
  return makeMockAuthResponse(user);
}

export async function getMe(token: string): Promise<UserData> {
  await delay();
  const userId = decodeTokenUserId(token) ?? MOCK_PARTICIPANT_ID;
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (user === undefined) throw new Error("resource.not_found");
  return user;
}

export async function getUserById(id: string, _token: string): Promise<UserData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user === undefined) throw new Error("resource.not_found");
  return user;
}

export async function updateUser(id: string, data: unknown, _token: string): Promise<UserData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user === undefined) throw new Error("resource.not_found");
  const parsed = UpdateUserSchema.safeParse(data);
  const patch = parsed.success
    ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
    : {};
  return { ...user, ...patch, updatedAt: new Date().toISOString() };
}

export async function deactivateUser(_id: string, _token: string): Promise<void> {
  await delay();
}

export async function activateUser(_id: string, _token: string): Promise<void> {
  await delay();
}

export async function listUsers(_token: string, params: URLSearchParams): Promise<UserListData> {
  await delay();
  const role = params.get("role");
  const activeParam = params.get("active");
  const VALID_ROLES: UserData["roles"] = [
    "SYSTEM_ADMIN",
    "CONGRESS_ADMIN",
    "PARTICIPANT",
    "GUEST_SPEAKER",
  ];
  const isValidRole = (r: string): r is UserData["roles"][number] =>
    (VALID_ROLES as ReadonlyArray<string>).includes(r);
  let items = MOCK_USERS;
  if (role !== null && isValidRole(role)) {
    items = items.filter((u) => u.roles.includes(role));
  }
  if (activeParam !== null) {
    const isActive = activeParam === "true";
    items = items.filter((u) => u.active === isActive);
  }
  return { items, totalItems: items.length, totalPages: 1 };
}

export async function createSystemAdmin(_data: unknown, _token: string): Promise<UserData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === MOCK_SYSTEM_ADMIN_ID);
  if (user === undefined) throw new Error("system.internal_error");
  return user;
}

export async function createCongressAdmin(_data: unknown, _token: string): Promise<UserData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === MOCK_CONGRESS_ADMIN_ID);
  if (user === undefined) throw new Error("system.internal_error");
  return user;
}

export async function createGuestSpeaker(_data: unknown, _token: string): Promise<UserData> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === MOCK_GUEST_SPEAKER_ID);
  if (user === undefined) throw new Error("system.internal_error");
  return user;
}

export async function canBeCommitteeMember(
  id: string,
  _token: string,
): Promise<{ canBeCommittee: boolean }> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user === undefined) return { canBeCommittee: false };
  const ineligibleRoles: string[] = ["GUEST_SPEAKER"];
  const canBeCommittee = user.active && !user.roles.some((r) => ineligibleRoles.includes(r));
  return { canBeCommittee };
}
