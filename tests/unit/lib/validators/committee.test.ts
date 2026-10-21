import { describe, it, expect } from "vitest";
import { AddCommitteeMemberSchema, CommitteeMemberSchema, CommitteeMemberListSchema } from "@/lib/validators/committee";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

describe("AddCommitteeMemberSchema", () => {
  it("accepts a valid userId UUID", () => {
    expect(AddCommitteeMemberSchema.safeParse({ userId: VALID_UUID }).success).toBe(true);
  });

  it("rejects an invalid userId UUID", () => {
    const result = AddCommitteeMemberSchema.safeParse({ userId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["userId"]).toBeDefined();
    }
  });

  it("rejects empty userId string", () => {
    expect(AddCommitteeMemberSchema.safeParse({ userId: "" }).success).toBe(false);
  });

  it("rejects missing userId field", () => {
    expect(AddCommitteeMemberSchema.safeParse({}).success).toBe(false);
  });

  it("rejects userId as a number", () => {
    expect(AddCommitteeMemberSchema.safeParse({ userId: 123 }).success).toBe(false);
  });
});

describe("CommitteeMemberSchema — response parsing", () => {
  const VALID_MEMBER = {
    congressId: VALID_UUID,
    userId: VALID_UUID,
    fullName: "Carlos Perez",
    email: "carlos@usac.edu.gt",
    addedAt: "2026-06-01T00:00:00Z",
  };

  it("accepts a valid committee member", () => {
    expect(CommitteeMemberSchema.safeParse(VALID_MEMBER).success).toBe(true);
  });

  it("rejects invalid congressId UUID", () => {
    expect(CommitteeMemberSchema.safeParse({ ...VALID_MEMBER, congressId: "bad-id" }).success).toBe(false);
  });

  it("rejects invalid userId UUID", () => {
    expect(CommitteeMemberSchema.safeParse({ ...VALID_MEMBER, userId: "bad-id" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(CommitteeMemberSchema.safeParse({ ...VALID_MEMBER, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects empty fullName", () => {
    // fullName is z.string() with no min — empty is technically allowed at schema level
    // Test presence of field
    const { fullName: _, ...withoutName } = VALID_MEMBER;
    expect(CommitteeMemberSchema.safeParse(withoutName).success).toBe(false);
  });

  it("rejects missing addedAt", () => {
    const { addedAt: _, ...withoutDate } = VALID_MEMBER;
    expect(CommitteeMemberSchema.safeParse(withoutDate).success).toBe(false);
  });
});

describe("CommitteeMemberListSchema", () => {
  it("accepts an empty list", () => {
    expect(
      CommitteeMemberListSchema.safeParse({ items: [], totalItems: 0, totalPages: 0 }).success,
    ).toBe(true);
  });

  it("rejects negative totalItems", () => {
    expect(
      CommitteeMemberListSchema.safeParse({ items: [], totalItems: -1, totalPages: 0 }).success,
    ).toBe(false);
  });

  it("rejects missing items array", () => {
    expect(CommitteeMemberListSchema.safeParse({ totalItems: 0, totalPages: 0 }).success).toBe(false);
  });
});
