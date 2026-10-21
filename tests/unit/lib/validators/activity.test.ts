import { describe, it, expect } from "vitest";
import { CreateActivitySchema, UpdateActivitySchema, ActivitySchema } from "@/lib/validators/activity";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";
const VALID_PONENCIA = {
  name: "Machine Learning Avanzado",
  description: "Introduccion a ML",
  type: "PONENCIA" as const,
  roomId: VALID_UUID,
  startTime: "2026-07-15T09:00",
  endTime: "2026-07-15T10:00",
  leaders: [VALID_UUID],
};

const VALID_TALLER = {
  ...VALID_PONENCIA,
  type: "TALLER" as const,
  workshopCapacity: 20,
};

describe("CreateActivitySchema — camino feliz", () => {
  it("accepts a valid PONENCIA activity", () => {
    expect(CreateActivitySchema.safeParse(VALID_PONENCIA).success).toBe(true);
  });

  it("accepts a valid TALLER activity with workshopCapacity", () => {
    expect(CreateActivitySchema.safeParse(VALID_TALLER).success).toBe(true);
  });

  it("accepts PONENCIA without workshopCapacity", () => {
    const { workshopCapacity: _, ...withoutCapacity } = VALID_TALLER;
    const data = { ...withoutCapacity, type: "PONENCIA" as const };
    expect(CreateActivitySchema.safeParse(data).success).toBe(true);
  });

  it("accepts empty leaders array", () => {
    expect(CreateActivitySchema.safeParse({ ...VALID_PONENCIA, leaders: [] }).success).toBe(true);
  });
});

describe("CreateActivitySchema — validaciones de campos requeridos", () => {
  it("rejects empty name", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["name"]).toBeDefined();
    }
  });

  it("rejects empty description", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, description: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["description"]).toBeDefined();
    }
  });

  it("rejects invalid roomId UUID", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, roomId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["roomId"]).toBeDefined();
    }
  });

  it("rejects invalid type", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, type: "CONFERENCIA" });
    expect(result.success).toBe(false);
  });

  it("rejects empty startTime", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, startTime: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty endTime", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, endTime: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid leader UUID in leaders array", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_PONENCIA, leaders: ["not-a-uuid"] });
    expect(result.success).toBe(false);
  });
});

describe("CreateActivitySchema — refine: TALLER requiere workshopCapacity", () => {
  it("rejects TALLER without workshopCapacity", () => {
    const { workshopCapacity: _, ...noCapacity } = VALID_TALLER;
    const result = CreateActivitySchema.safeParse({ ...noCapacity, type: "TALLER" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["workshopCapacity"]).toBeDefined();
    }
  });

  it("rejects TALLER with workshopCapacity = 0", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_TALLER, workshopCapacity: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["workshopCapacity"]).toBeDefined();
    }
  });

  it("rejects TALLER with negative workshopCapacity", () => {
    const result = CreateActivitySchema.safeParse({ ...VALID_TALLER, workshopCapacity: -5 });
    expect(result.success).toBe(false);
  });

  it("accepts PONENCIA when workshopCapacity is undefined", () => {
    const data = { ...VALID_PONENCIA };
    expect(CreateActivitySchema.safeParse(data).success).toBe(true);
  });
});

describe("CreateActivitySchema — refine: endTime debe ser posterior a startTime", () => {
  it("rejects endTime equal to startTime", () => {
    const result = CreateActivitySchema.safeParse({
      ...VALID_PONENCIA,
      startTime: "2026-07-15T09:00",
      endTime: "2026-07-15T09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["endTime"]).toBeDefined();
    }
  });

  it("rejects endTime before startTime", () => {
    const result = CreateActivitySchema.safeParse({
      ...VALID_PONENCIA,
      startTime: "2026-07-15T10:00",
      endTime: "2026-07-15T09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["endTime"]).toBeDefined();
    }
  });

  it("accepts endTime one minute after startTime", () => {
    expect(
      CreateActivitySchema.safeParse({
        ...VALID_PONENCIA,
        startTime: "2026-07-15T09:00",
        endTime: "2026-07-15T09:01",
      }).success,
    ).toBe(true);
  });

  it("skips time refine when both times are empty strings", () => {
    // The refine skips validation when times are empty (empty string returns early)
    const result = CreateActivitySchema.safeParse({
      ...VALID_PONENCIA,
      startTime: "",
      endTime: "",
    });
    // startTime/endTime min(1) will fail first — but the refine should not add confusion
    expect(result.success).toBe(false);
    if (!result.success) {
      // endTime refine error should NOT appear when fields are blank (fields themselves are invalid)
      const errors = result.error.flatten().fieldErrors;
      // The field-level errors fire before the refine
      expect(errors["startTime"] ?? errors["endTime"]).toBeDefined();
    }
  });
});

describe("UpdateActivitySchema", () => {
  it("accepts a partial update (only name)", () => {
    expect(UpdateActivitySchema.safeParse({ name: "Nuevo nombre" }).success).toBe(true);
  });

  it("accepts an empty object (all optional)", () => {
    expect(UpdateActivitySchema.safeParse({}).success).toBe(true);
  });

  it("rejects name as empty string (min 1)", () => {
    expect(UpdateActivitySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects invalid roomId if provided", () => {
    expect(UpdateActivitySchema.safeParse({ roomId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("ActivitySchema — response parsing", () => {
  const VALID_ACTIVITY = {
    id: VALID_UUID,
    congressId: VALID_UUID,
    roomId: VALID_UUID,
    name: "Test",
    description: "Desc",
    type: "PONENCIA",
    startTime: "2026-07-15T09:00:00Z",
    endTime: "2026-07-15T10:00:00Z",
    leaders: [],
    workshopCapacity: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("accepts a valid activity from the API", () => {
    expect(ActivitySchema.safeParse(VALID_ACTIVITY).success).toBe(true);
  });

  it("accepts TALLER with non-null workshopCapacity", () => {
    expect(ActivitySchema.safeParse({ ...VALID_ACTIVITY, type: "TALLER", workshopCapacity: 30 }).success).toBe(true);
  });

  it("rejects PONENCIA with negative workshopCapacity (domain inconsistency)", () => {
    // The response schema validates workshopCapacity as positive if not null
    const result = ActivitySchema.safeParse({ ...VALID_ACTIVITY, workshopCapacity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { name: _, ...withoutName } = VALID_ACTIVITY;
    expect(ActivitySchema.safeParse(withoutName).success).toBe(false);
  });
});
