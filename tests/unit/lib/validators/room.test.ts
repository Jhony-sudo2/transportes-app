import { describe, it, expect } from "vitest";
import { CreateRoomSchema, UpdateRoomSchema, RoomSchema } from "@/lib/validators/room";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

describe("CreateRoomSchema — camino feliz", () => {
  it("accepts a minimal room (name only)", () => {
    expect(CreateRoomSchema.safeParse({ name: "Aula 101" }).success).toBe(true);
  });

  it("accepts a room with optional capacity and location", () => {
    expect(
      CreateRoomSchema.safeParse({ name: "Salon Principal", capacity: 50, location: "Edificio T1" }).success,
    ).toBe(true);
  });

  it("accepts capacity of 1 (minimum positive)", () => {
    expect(CreateRoomSchema.safeParse({ name: "Sala Chica", capacity: 1 }).success).toBe(true);
  });

  it("accepts room without capacity (unlimited)", () => {
    expect(CreateRoomSchema.safeParse({ name: "Auditorio" }).success).toBe(true);
  });
});

describe("CreateRoomSchema — validaciones de name", () => {
  it("rejects empty name", () => {
    const result = CreateRoomSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["name"]).toBeDefined();
    }
  });

  it("rejects missing name field", () => {
    expect(CreateRoomSchema.safeParse({}).success).toBe(false);
  });
});

describe("CreateRoomSchema — validaciones de capacity", () => {
  it("rejects capacity = 0", () => {
    const result = CreateRoomSchema.safeParse({ name: "Sala", capacity: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["capacity"]).toBeDefined();
    }
  });

  it("rejects negative capacity", () => {
    const result = CreateRoomSchema.safeParse({ name: "Sala", capacity: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer capacity", () => {
    const result = CreateRoomSchema.safeParse({ name: "Sala", capacity: 10.5 });
    expect(result.success).toBe(false);
  });

  it("rejects capacity as string", () => {
    const result = CreateRoomSchema.safeParse({ name: "Sala", capacity: "50" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateRoomSchema", () => {
  it("accepts an empty object (all optional)", () => {
    expect(UpdateRoomSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update (only name)", () => {
    expect(UpdateRoomSchema.safeParse({ name: "Nuevo Nombre" }).success).toBe(true);
  });

  it("accepts partial update (only capacity)", () => {
    expect(UpdateRoomSchema.safeParse({ capacity: 30 }).success).toBe(true);
  });

  it("rejects empty name in partial update", () => {
    expect(UpdateRoomSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects negative capacity in partial update", () => {
    expect(UpdateRoomSchema.safeParse({ capacity: -1 }).success).toBe(false);
  });
});

describe("RoomSchema — response parsing", () => {
  const VALID_ROOM = {
    id: VALID_UUID,
    congressId: VALID_UUID,
    name: "Salon A",
    capacity: 100,
    location: "Planta baja",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("accepts a valid room", () => {
    expect(RoomSchema.safeParse(VALID_ROOM).success).toBe(true);
  });

  it("accepts null capacity (unlimited room)", () => {
    expect(RoomSchema.safeParse({ ...VALID_ROOM, capacity: null }).success).toBe(true);
  });

  it("accepts null location", () => {
    expect(RoomSchema.safeParse({ ...VALID_ROOM, location: null }).success).toBe(true);
  });

  it("rejects invalid congressId UUID", () => {
    expect(RoomSchema.safeParse({ ...VALID_ROOM, congressId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name: _, ...withoutName } = VALID_ROOM;
    expect(RoomSchema.safeParse(withoutName).success).toBe(false);
  });
});
