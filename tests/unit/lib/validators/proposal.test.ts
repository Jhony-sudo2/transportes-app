import { describe, it, expect } from "vitest";
import { CreateProposalSchema, ProposalSchema, ProposalListSchema } from "@/lib/validators/proposal";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

const VALID_CREATE = {
  title: "Machine Learning en la Educacion",
  description: "Exploracion de ML como herramienta pedagogica",
  type: "PONENCIA" as const,
};

describe("CreateProposalSchema — camino feliz", () => {
  it("accepts a valid PONENCIA proposal", () => {
    expect(CreateProposalSchema.safeParse(VALID_CREATE).success).toBe(true);
  });

  it("accepts a valid TALLER proposal", () => {
    expect(CreateProposalSchema.safeParse({ ...VALID_CREATE, type: "TALLER" }).success).toBe(true);
  });
});

describe("CreateProposalSchema — validaciones de title", () => {
  it("rejects empty title", () => {
    const result = CreateProposalSchema.safeParse({ ...VALID_CREATE, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["title"]).toBeDefined();
    }
  });

  it("rejects missing title", () => {
    const { title: _, ...withoutTitle } = VALID_CREATE;
    expect(CreateProposalSchema.safeParse(withoutTitle).success).toBe(false);
  });
});

describe("CreateProposalSchema — validaciones de description", () => {
  it("rejects empty description", () => {
    const result = CreateProposalSchema.safeParse({ ...VALID_CREATE, description: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["description"]).toBeDefined();
    }
  });

  it("rejects missing description", () => {
    const { description: _, ...withoutDesc } = VALID_CREATE;
    expect(CreateProposalSchema.safeParse(withoutDesc).success).toBe(false);
  });
});

describe("CreateProposalSchema — validaciones de type", () => {
  it("rejects invalid type value", () => {
    const result = CreateProposalSchema.safeParse({ ...VALID_CREATE, type: "CONFERENCIA" });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const { type: _, ...withoutType } = VALID_CREATE;
    expect(CreateProposalSchema.safeParse(withoutType).success).toBe(false);
  });
});

describe("ProposalSchema — response parsing", () => {
  const VALID_PENDING = {
    id: VALID_UUID,
    callId: VALID_UUID,
    authorUserId: VALID_UUID,
    title: "Propuesta Test",
    description: "Descripcion de la propuesta",
    type: "PONENCIA",
    status: "PENDING",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-06-01T00:00:00Z",
  };

  it("accepts a valid PENDING proposal", () => {
    expect(ProposalSchema.safeParse(VALID_PENDING).success).toBe(true);
  });

  it("accepts an APPROVED proposal with reviewer data", () => {
    expect(
      ProposalSchema.safeParse({
        ...VALID_PENDING,
        status: "APPROVED",
        reviewedBy: VALID_UUID,
        reviewedAt: "2026-06-05T10:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("accepts a REJECTED proposal with reviewer data", () => {
    expect(
      ProposalSchema.safeParse({
        ...VALID_PENDING,
        status: "REJECTED",
        reviewedBy: VALID_UUID,
        reviewedAt: "2026-06-05T10:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("accepts null reviewedBy and reviewedAt for PENDING", () => {
    expect(ProposalSchema.safeParse(VALID_PENDING).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(ProposalSchema.safeParse({ ...VALID_PENDING, status: "UNDER_REVIEW" }).success).toBe(false);
  });

  it("rejects invalid authorUserId UUID", () => {
    expect(ProposalSchema.safeParse({ ...VALID_PENDING, authorUserId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid reviewedBy UUID when not null", () => {
    expect(
      ProposalSchema.safeParse({ ...VALID_PENDING, status: "APPROVED", reviewedBy: "invalid-uuid", reviewedAt: "2026-06-05T10:00:00Z" }).success,
    ).toBe(false);
  });
});

describe("ProposalListSchema", () => {
  it("accepts an empty list", () => {
    expect(
      ProposalListSchema.safeParse({ items: [], totalItems: 0, totalPages: 0 }).success,
    ).toBe(true);
  });

  it("rejects negative totalItems", () => {
    expect(
      ProposalListSchema.safeParse({ items: [], totalItems: -1, totalPages: 0 }).success,
    ).toBe(false);
  });
});
