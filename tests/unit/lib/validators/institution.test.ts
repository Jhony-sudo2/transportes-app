import { describe, it, expect } from "vitest";
import { CreateInstitutionSchema, UpdateInstitutionSchema, InstitutionSchema } from "@/lib/validators/institution";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

const VALID = {
  name: "Universidad de San Carlos",
  description: "Primera universidad de Guatemala",
  contactEmail: "contacto@usac.edu.gt",
};

describe("CreateInstitutionSchema — camino feliz", () => {
  it("accepts a valid institution", () => {
    expect(CreateInstitutionSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a long description", () => {
    expect(
      CreateInstitutionSchema.safeParse({ ...VALID, description: "A".repeat(500) }).success,
    ).toBe(true);
  });
});

describe("CreateInstitutionSchema — validaciones de campos", () => {
  it("rejects empty name", () => {
    const result = CreateInstitutionSchema.safeParse({ ...VALID, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["name"]).toBeDefined();
    }
  });

  it("rejects empty description", () => {
    const result = CreateInstitutionSchema.safeParse({ ...VALID, description: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["description"]).toBeDefined();
    }
  });

  it("rejects invalid contactEmail", () => {
    const result = CreateInstitutionSchema.safeParse({ ...VALID, contactEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["contactEmail"]).toBeDefined();
    }
  });

  it("rejects empty contactEmail", () => {
    const result = CreateInstitutionSchema.safeParse({ ...VALID, contactEmail: "" });
    expect(result.success).toBe(false);
  });

  it("rejects email without domain", () => {
    const result = CreateInstitutionSchema.safeParse({ ...VALID, contactEmail: "user@" });
    expect(result.success).toBe(false);
  });

  it("rejects email without @", () => {
    const result = CreateInstitutionSchema.safeParse({ ...VALID, contactEmail: "userexample.com" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name field", () => {
    const { name: _, ...withoutName } = VALID;
    expect(CreateInstitutionSchema.safeParse(withoutName).success).toBe(false);
  });

  it("rejects missing contactEmail field", () => {
    const { contactEmail: _, ...withoutEmail } = VALID;
    expect(CreateInstitutionSchema.safeParse(withoutEmail).success).toBe(false);
  });
});

describe("UpdateInstitutionSchema", () => {
  it("accepts a full update", () => {
    expect(CreateInstitutionSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts empty object (all optional via .partial())", () => {
    expect(UpdateInstitutionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update (only name)", () => {
    expect(UpdateInstitutionSchema.safeParse({ name: "Nueva USAC" }).success).toBe(true);
  });

  it("rejects invalid contactEmail in partial update", () => {
    expect(UpdateInstitutionSchema.safeParse({ contactEmail: "bad-email" }).success).toBe(false);
  });

  it("rejects empty name in partial update", () => {
    expect(UpdateInstitutionSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("InstitutionSchema — response parsing", () => {
  const VALID_RESPONSE = {
    id: VALID_UUID,
    name: "USAC",
    description: "Universidad de San Carlos",
    contactEmail: "info@usac.edu.gt",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("accepts a valid institution response", () => {
    expect(InstitutionSchema.safeParse(VALID_RESPONSE).success).toBe(true);
  });

  it("accepts active=false (soft-deleted)", () => {
    expect(InstitutionSchema.safeParse({ ...VALID_RESPONSE, active: false }).success).toBe(true);
  });

  it("rejects missing id", () => {
    const { id: _, ...withoutId } = VALID_RESPONSE;
    expect(InstitutionSchema.safeParse(withoutId).success).toBe(false);
  });

  it("rejects invalid id UUID", () => {
    expect(InstitutionSchema.safeParse({ ...VALID_RESPONSE, id: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid contactEmail in response", () => {
    expect(InstitutionSchema.safeParse({ ...VALID_RESPONSE, contactEmail: "bad" }).success).toBe(false);
  });
});
