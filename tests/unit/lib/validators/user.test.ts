import { describe, it, expect } from "vitest";
import {
  CreateSystemAdminSchema,
  CreateCongressAdminSchema,
  CreateGuestSpeakerSchema,
  UpdateUserSchema,
  UserSchema,
} from "@/lib/validators/user";

const VALID_UUID = "11111111-0000-0000-0000-000000000001";

const VALID_BASE = {
  email: "usuario@usac.edu.gt",
  password: "Password123!",
  fullName: "Juan Garcia Lopez",
  organization: "USAC",
  phone: "55551234",
  personalId: "123ABC",
};

describe("CreateSystemAdminSchema — camino feliz", () => {
  it("accepts a valid system admin", () => {
    expect(CreateSystemAdminSchema.safeParse(VALID_BASE).success).toBe(true);
  });

  it("accepts personalId with only letters", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "ABCDEF" }).success).toBe(true);
  });

  it("accepts personalId with only numbers", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "12345678" }).success).toBe(true);
  });

  it("accepts alphanumeric personalId (mixed case)", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "ABC123def" }).success).toBe(true);
  });
});

describe("CreateSystemAdminSchema — validaciones de email", () => {
  it("rejects invalid email", () => {
    const result = CreateSystemAdminSchema.safeParse({ ...VALID_BASE, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["email"]).toBeDefined();
    }
  });

  it("rejects empty email", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, email: "" }).success).toBe(false);
  });
});

describe("CreateSystemAdminSchema — validaciones de password", () => {
  it("rejects password shorter than 8 characters", () => {
    const result = CreateSystemAdminSchema.safeParse({ ...VALID_BASE, password: "Pass1!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["password"]).toBeDefined();
    }
  });

  it("accepts password with exactly 8 characters", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, password: "Pass123!" }).success).toBe(true);
  });
});

describe("CreateSystemAdminSchema — validaciones de personalId", () => {
  it("rejects personalId with spaces", () => {
    const result = CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "123 456" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["personalId"]).toBeDefined();
    }
  });

  it("rejects personalId with hyphens", () => {
    const result = CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "123-456" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["personalId"]).toBeDefined();
    }
  });

  it("rejects personalId with special characters", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "DPI@2024" }).success).toBe(false);
  });

  it("rejects empty personalId", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, personalId: "" }).success).toBe(false);
  });
});

describe("CreateSystemAdminSchema — otros campos requeridos", () => {
  it("rejects empty fullName", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, fullName: "" }).success).toBe(false);
  });

  it("rejects empty organization", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, organization: "" }).success).toBe(false);
  });

  it("rejects empty phone", () => {
    expect(CreateSystemAdminSchema.safeParse({ ...VALID_BASE, phone: "" }).success).toBe(false);
  });
});

describe("CreateCongressAdminSchema — linkedInstitutions", () => {
  const VALID_CA = { ...VALID_BASE, linkedInstitutions: [VALID_UUID] };

  it("accepts a congress admin with one institution", () => {
    expect(CreateCongressAdminSchema.safeParse(VALID_CA).success).toBe(true);
  });

  it("accepts a congress admin with multiple institutions", () => {
    const second = VALID_UUID.replace("11111111", "22222222");
    expect(CreateCongressAdminSchema.safeParse({ ...VALID_CA, linkedInstitutions: [VALID_UUID, second] }).success).toBe(true);
  });

  it("rejects empty linkedInstitutions array", () => {
    const result = CreateCongressAdminSchema.safeParse({ ...VALID_CA, linkedInstitutions: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["linkedInstitutions"]).toBeDefined();
    }
  });

  it("rejects linkedInstitutions with invalid UUID", () => {
    expect(CreateCongressAdminSchema.safeParse({ ...VALID_CA, linkedInstitutions: ["not-a-uuid"] }).success).toBe(false);
  });

  it("rejects missing linkedInstitutions field", () => {
    expect(CreateCongressAdminSchema.safeParse(VALID_BASE).success).toBe(false);
  });
});

describe("CreateGuestSpeakerSchema", () => {
  const VALID_GUEST = {
    fullName: "Ponente Invitado",
    email: "ponente@external.com",
    organization: "MIT",
    phone: "55559999",
    personalId: "EXT2024",
  };

  it("accepts a valid guest speaker", () => {
    expect(CreateGuestSpeakerSchema.safeParse(VALID_GUEST).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(CreateGuestSpeakerSchema.safeParse({ ...VALID_GUEST, email: "invalid" }).success).toBe(false);
  });

  it("rejects personalId with special chars", () => {
    expect(CreateGuestSpeakerSchema.safeParse({ ...VALID_GUEST, personalId: "EXT-2024" }).success).toBe(false);
  });

  it("rejects empty fullName", () => {
    expect(CreateGuestSpeakerSchema.safeParse({ ...VALID_GUEST, fullName: "" }).success).toBe(false);
  });

  it("rejects empty organization", () => {
    expect(CreateGuestSpeakerSchema.safeParse({ ...VALID_GUEST, organization: "" }).success).toBe(false);
  });
});

describe("UpdateUserSchema", () => {
  it("accepts a full update", () => {
    expect(
      UpdateUserSchema.safeParse({
        fullName: "Nuevo Nombre",
        organization: "Nueva Org",
        phone: "55554321",
        photoUrl: "https://example.com/photo.jpg",
      }).success,
    ).toBe(true);
  });

  it("accepts an empty object (all optional)", () => {
    expect(UpdateUserSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial update (only phone)", () => {
    expect(UpdateUserSchema.safeParse({ phone: "55551111" }).success).toBe(true);
  });

  it("rejects empty fullName when provided", () => {
    expect(UpdateUserSchema.safeParse({ fullName: "" }).success).toBe(false);
  });

  it("rejects invalid URL in photoUrl", () => {
    expect(UpdateUserSchema.safeParse({ photoUrl: "not-a-url" }).success).toBe(false);
  });

  it("accepts a valid https photoUrl", () => {
    expect(UpdateUserSchema.safeParse({ photoUrl: "https://s3.amazonaws.com/bucket/photo.jpg" }).success).toBe(true);
  });
});

describe("UserSchema — response parsing", () => {
  const VALID_USER = {
    id: VALID_UUID,
    email: "test@usac.edu.gt",
    fullName: "Test User",
    organization: "USAC",
    phone: "55551234",
    personalId: "TEST001",
    photoUrl: null,
    active: true,
    roles: ["PARTICIPANT"],
    linkedInstitutions: [],
  };

  it("accepts a valid participant user", () => {
    expect(UserSchema.safeParse(VALID_USER).success).toBe(true);
  });

  it("accepts CONGRESS_ADMIN role with linked institutions", () => {
    expect(
      UserSchema.safeParse({
        ...VALID_USER,
        roles: ["CONGRESS_ADMIN", "PARTICIPANT"],
        linkedInstitutions: [VALID_UUID],
      }).success,
    ).toBe(true);
  });

  it("rejects unknown role", () => {
    expect(UserSchema.safeParse({ ...VALID_USER, roles: ["MANAGER"] }).success).toBe(false);
  });

  it("accepts null photoUrl", () => {
    expect(UserSchema.safeParse({ ...VALID_USER, photoUrl: null }).success).toBe(true);
  });

  it("rejects invalid email in response", () => {
    expect(UserSchema.safeParse({ ...VALID_USER, email: "invalid" }).success).toBe(false);
  });

  it("defaults linkedInstitutions to empty array when missing", () => {
    const { linkedInstitutions: _, ...withoutInstitutions } = VALID_USER;
    const result = UserSchema.safeParse(withoutInstitutions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedInstitutions).toEqual([]);
    }
  });
});
