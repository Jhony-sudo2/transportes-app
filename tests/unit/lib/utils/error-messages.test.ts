import { describe, it, expect } from "vitest";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";

describe("ERROR_MESSAGES lookup table", () => {
  it("maps validation.failed to Spanish message", () => {
    expect(ERROR_MESSAGES["validation.failed"]).toBe(
      "Los datos ingresados no son validos. Revisa el formulario.",
    );
  });

  it("maps auth.invalid_credentials to Spanish message", () => {
    expect(ERROR_MESSAGES["auth.invalid_credentials"]).toBe(
      "Correo electronico o contrasena incorrectos.",
    );
  });

  it("maps auth.token_expired to Spanish message", () => {
    expect(ERROR_MESSAGES["auth.token_expired"]).toBe(
      "Tu sesion ha expirado. Inicia sesion nuevamente.",
    );
  });

  it("maps auth.token_invalid to Spanish message", () => {
    expect(ERROR_MESSAGES["auth.token_invalid"]).toBe(
      "La sesion no es valida. Inicia sesion nuevamente.",
    );
  });

  it("maps auth.forbidden to Spanish message", () => {
    expect(ERROR_MESSAGES["auth.forbidden"]).toBe(
      "No tienes permiso para realizar esta accion.",
    );
  });

  it("maps resource.not_found to Spanish message", () => {
    expect(ERROR_MESSAGES["resource.not_found"]).toBe(
      "El recurso solicitado no existe.",
    );
  });

  it("maps resource.conflict to Spanish message", () => {
    expect(ERROR_MESSAGES["resource.conflict"]).toBe(
      "Ya existe un registro con esos datos.",
    );
  });

  it("maps domain.invariant_violated to Spanish message", () => {
    expect(ERROR_MESSAGES["domain.invariant_violated"]).toBe(
      "La operacion viola una regla del sistema.",
    );
  });

  it("maps wallet.insufficient_funds to Spanish message", () => {
    expect(ERROR_MESSAGES["wallet.insufficient_funds"]).toBe(
      "Saldo insuficiente en la cartera.",
    );
  });

  it("maps committee.not_member to Spanish message", () => {
    expect(ERROR_MESSAGES["committee.not_member"]).toBe(
      "No eres miembro del comite de este congreso.",
    );
  });

  it("maps idempotency.replay to Spanish message", () => {
    expect(ERROR_MESSAGES["idempotency.replay"]).toBe(
      "La solicitud ya fue procesada anteriormente.",
    );
  });

  it("maps system.internal_error to Spanish message", () => {
    expect(ERROR_MESSAGES["system.internal_error"]).toBe(
      "Ocurrio un error inesperado. Intenta de nuevo mas tarde.",
    );
  });

  it("returns undefined for unknown error codes", () => {
    expect(ERROR_MESSAGES["unknown.code"]).toBeUndefined();
  });

  it("is a plain object (not null, not array)", () => {
    expect(typeof ERROR_MESSAGES).toBe("object");
    expect(Array.isArray(ERROR_MESSAGES)).toBe(false);
    expect(ERROR_MESSAGES).not.toBeNull();
  });

  it("covers all 12 documented API error codes", () => {
    const documented = [
      "validation.failed",
      "auth.invalid_credentials",
      "auth.token_expired",
      "auth.token_invalid",
      "auth.forbidden",
      "resource.not_found",
      "resource.conflict",
      "domain.invariant_violated",
      "wallet.insufficient_funds",
      "committee.not_member",
      "idempotency.replay",
      "system.internal_error",
    ];
    documented.forEach((code) => {
      expect(ERROR_MESSAGES[code], `Missing message for code: ${code}`).toBeDefined();
    });
  });

  it("all messages are non-empty strings", () => {
    Object.entries(ERROR_MESSAGES).forEach(([code, message]) => {
      expect(typeof message, `Message for ${code} should be a string`).toBe("string");
      expect(message.length, `Message for ${code} should not be empty`).toBeGreaterThan(0);
    });
  });
});
