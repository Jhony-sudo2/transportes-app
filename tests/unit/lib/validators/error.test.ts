import { describe, it, expect } from "vitest";
import { ProblemDetailSchema } from "@/lib/validators/error";

describe("ProblemDetailSchema", () => {
  it("parses a valid RFC 7807 problem detail", () => {
    const result = ProblemDetailSchema.safeParse({
      type: "https://api.codenbugs.com/errors/not-found",
      title: "Recurso no encontrado",
      status: 404,
      detail: "El congreso con id 123 no existe",
      code: "resource.not_found",
      instance: "/congresses/123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("resource.not_found");
      expect(result.data.status).toBe(404);
    }
  });

  it("rejects a body without code field", () => {
    const result = ProblemDetailSchema.safeParse({
      status: 404,
      detail: "Not found",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown error code", () => {
    const result = ProblemDetailSchema.safeParse({
      status: 400,
      detail: "Error",
      code: "unknown.error.code",
    });
    expect(result.success).toBe(false);
  });

  it("parses a minimal valid body without optional fields", () => {
    const result = ProblemDetailSchema.safeParse({
      status: 422,
      detail: "El precio debe ser mayor o igual a Q35.00",
      code: "domain.invariant_violated",
    });
    expect(result.success).toBe(true);
  });

  it("parses auth.token_expired code", () => {
    const result = ProblemDetailSchema.safeParse({
      status: 401,
      detail: "El token ha expirado",
      code: "auth.token_expired",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("auth.token_expired");
    }
  });

  it("parses wallet.insufficient_funds code", () => {
    const result = ProblemDetailSchema.safeParse({
      status: 422,
      detail: "Saldo insuficiente",
      code: "wallet.insufficient_funds",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing status field", () => {
    const result = ProblemDetailSchema.safeParse({
      detail: "Error",
      code: "resource.not_found",
    });
    expect(result.success).toBe(false);
  });
});
