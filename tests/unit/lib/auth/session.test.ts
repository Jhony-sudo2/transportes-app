import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock next/headers
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookieGet })),
}));

// Mock the validators
vi.mock("@/lib/validators/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validators/auth")>();
  return actual;
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when access_token cookie is absent", async () => {
    mockCookieGet.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null when access_token cookie is an empty string", async () => {
    mockCookieGet.mockReturnValue({ value: "" });
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    mockCookieGet.mockReturnValue({ value: "not.a.valid.jwt.parts" });
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null for a token with invalid payload", async () => {
    // Header.payload.signature where payload is not valid session data
    const header = Buffer.from('{"alg":"RS256"}').toString("base64url");
    const payload = Buffer.from('{"sub":"123","not-valid":true}').toString("base64url");
    const token = `${header}.${payload}.signature`;

    mockCookieGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns a Session for a valid JWT payload", async () => {
    const sessionData = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      fullName: "Juan Perez",
      roles: ["PARTICIPANT"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const header = Buffer.from('{"alg":"RS256","typ":"JWT"}').toString("base64url");
    const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
    const token = `${header}.${payload}.mock_signature`;

    mockCookieGet.mockReturnValue({ value: token });

    // Re-import to get a fresh module (clear module cache)
    vi.resetModules();
    vi.mock("server-only", () => ({}));
    vi.mock("next/headers", () => ({
      cookies: vi.fn(() => Promise.resolve({ get: mockCookieGet })),
    }));

    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();

    expect(session).not.toBeNull();
    if (session !== null) {
      expect(session.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(session.email).toBe("user@example.com");
      expect(session.roles).toContain("PARTICIPANT");
    }
  });
});
