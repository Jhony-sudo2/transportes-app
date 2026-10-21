export type Role = "SYSTEM_ADMIN" | "CONGRESS_ADMIN" | "PARTICIPANT" | "GUEST_SPEAKER";

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  roles: Role[];
  exp: number;
  iat: number;
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}
