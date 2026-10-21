import { describe, it, expect } from "vitest";
import { CallSchema, CallListSchema } from "@/lib/validators/call";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

const VALID_OPEN_CALL = {
  id: VALID_UUID,
  congressId: VALID_UUID,
  status: "OPEN" as const,
  openedAt: "2026-06-01T08:00:00Z",
  closedAt: null,
};

const VALID_CLOSED_CALL = {
  id: VALID_UUID,
  congressId: VALID_UUID,
  status: "CLOSED" as const,
  openedAt: "2026-06-01T08:00:00Z",
  closedAt: "2026-06-15T18:00:00Z",
};

describe("CallSchema — camino feliz", () => {
  it("accepts a valid OPEN call with null closedAt", () => {
    expect(CallSchema.safeParse(VALID_OPEN_CALL).success).toBe(true);
  });

  it("accepts a valid CLOSED call with a closedAt date", () => {
    expect(CallSchema.safeParse(VALID_CLOSED_CALL).success).toBe(true);
  });

  it("parses and returns correct data for an OPEN call", () => {
    const result = CallSchema.safeParse(VALID_OPEN_CALL);
    if (!result.success) throw new Error("Expected parse to succeed");
    expect(result.data.status).toBe("OPEN");
    expect(result.data.closedAt).toBeNull();
  });

  it("parses and returns correct data for a CLOSED call", () => {
    const result = CallSchema.safeParse(VALID_CLOSED_CALL);
    if (!result.success) throw new Error("Expected parse to succeed");
    expect(result.data.status).toBe("CLOSED");
    expect(result.data.closedAt).toBe("2026-06-15T18:00:00Z");
  });
});

describe("CallSchema — validaciones de campos requeridos", () => {
  it("rejects invalid id UUID", () => {
    const result = CallSchema.safeParse({ ...VALID_OPEN_CALL, id: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["id"]).toBeDefined();
    }
  });

  it("rejects invalid congressId UUID", () => {
    const result = CallSchema.safeParse({ ...VALID_OPEN_CALL, congressId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["congressId"]).toBeDefined();
    }
  });

  it("rejects missing id", () => {
    const { id: _, ...withoutId } = VALID_OPEN_CALL;
    expect(CallSchema.safeParse(withoutId).success).toBe(false);
  });

  it("rejects missing congressId", () => {
    const { congressId: _, ...withoutCongressId } = VALID_OPEN_CALL;
    expect(CallSchema.safeParse(withoutCongressId).success).toBe(false);
  });

  it("rejects missing openedAt", () => {
    const { openedAt: _, ...withoutOpenedAt } = VALID_OPEN_CALL;
    expect(CallSchema.safeParse(withoutOpenedAt).success).toBe(false);
  });
});

describe("CallSchema — state machine: status", () => {
  it("rejects an unknown status value", () => {
    const result = CallSchema.safeParse({ ...VALID_OPEN_CALL, status: "PENDING" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["status"]).toBeDefined();
    }
  });

  it("rejects empty string as status", () => {
    const result = CallSchema.safeParse({ ...VALID_OPEN_CALL, status: "" });
    expect(result.success).toBe(false);
  });

  it("only accepts OPEN and CLOSED as valid statuses", () => {
    expect(CallSchema.safeParse({ ...VALID_OPEN_CALL, status: "OPEN" }).success).toBe(true);
    expect(CallSchema.safeParse({ ...VALID_CLOSED_CALL, status: "CLOSED" }).success).toBe(true);
    expect(CallSchema.safeParse({ ...VALID_OPEN_CALL, status: "DRAFT" }).success).toBe(false);
  });
});

describe("CallSchema — campo closedAt", () => {
  it("accepts null closedAt for OPEN call", () => {
    expect(CallSchema.safeParse({ ...VALID_OPEN_CALL, closedAt: null }).success).toBe(true);
  });

  it("accepts non-null closedAt for CLOSED call", () => {
    expect(CallSchema.safeParse(VALID_CLOSED_CALL).success).toBe(true);
  });
});

describe("CallListSchema", () => {
  const VALID_LIST = {
    items: [VALID_OPEN_CALL, VALID_CLOSED_CALL],
    totalItems: 2,
    totalPages: 1,
  };

  it("accepts a valid list with two calls", () => {
    expect(CallListSchema.safeParse(VALID_LIST).success).toBe(true);
  });

  it("accepts an empty items array", () => {
    expect(CallListSchema.safeParse({ items: [], totalItems: 0, totalPages: 0 }).success).toBe(true);
  });

  it("rejects negative totalItems", () => {
    const result = CallListSchema.safeParse({ ...VALID_LIST, totalItems: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["totalItems"]).toBeDefined();
    }
  });

  it("rejects negative totalPages", () => {
    const result = CallListSchema.safeParse({ ...VALID_LIST, totalPages: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["totalPages"]).toBeDefined();
    }
  });

  it("rejects items containing an invalid call", () => {
    const invalidCall = { ...VALID_OPEN_CALL, id: "not-a-uuid" };
    const result = CallListSchema.safeParse({ ...VALID_LIST, items: [invalidCall] });
    expect(result.success).toBe(false);
  });

  it("rejects missing items field", () => {
    const { items: _, ...withoutItems } = VALID_LIST;
    expect(CallListSchema.safeParse(withoutItems).success).toBe(false);
  });
});
