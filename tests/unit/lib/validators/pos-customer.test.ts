import { describe, expect, it } from "vitest";
import { PosCustomerSchema } from "@/lib/validators/commerce";

// Forma real de GET /customers/by-nit (Identity): no trae `email`, sino estos dos campos.
const buyer = (overrides: Record<string, unknown>) => ({
  customerId: 5,
  nit: "1234567",
  fullName: "Ana López",
  active: true,
  hasUser: true,
  verifiedAccountEmail: null,
  contactEmail: null,
  ...overrides,
});

describe("PosCustomerSchema: correo del comprador en venta presencial (#24)", () => {
  it("con cuenta, muestra el correo verificado de la cuenta", () => {
    const parsed = PosCustomerSchema.parse(buyer({ verifiedAccountEmail: "ana@example.com" }));
    expect(parsed.email).toBe("ana@example.com");
    expect(parsed).not.toHaveProperty("verifiedAccountEmail");
  });
  it("sin cuenta, usa el correo de contacto registrado", () => {
    const parsed = PosCustomerSchema.parse(
      buyer({ hasUser: false, contactEmail: " contacto@example.com " }),
    );
    expect(parsed.email).toBe("contacto@example.com");
  });
  it("con cuenta nunca toma el correo de contacto", () => {
    const parsed = PosCustomerSchema.parse(buyer({ contactEmail: "otro@example.com" }));
    expect(parsed.email).toBeUndefined();
  });
  it("sin correo verificado queda sin correo (la UI avisa que solo se imprime)", () => {
    expect(PosCustomerSchema.parse(buyer({})).email).toBeUndefined();
    expect(PosCustomerSchema.parse(buyer({ verifiedAccountEmail: "  " })).email).toBeUndefined();
  });
  it("respeta un `email` ya normalizado y rechaza correos inválidos", () => {
    expect(PosCustomerSchema.parse(buyer({ email: "ya@example.com" })).email).toBe(
      "ya@example.com",
    );
    expect(
      PosCustomerSchema.safeParse(buyer({ verifiedAccountEmail: "no-es-correo" })).success,
    ).toBe(false);
  });
});
