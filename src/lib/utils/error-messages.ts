/**
 * Maps stable API error codes to human-readable Spanish messages.
 * Used in the UI to display user-facing errors.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  "validation.failed": "Los datos ingresados no son validos. Revisa el formulario.",
  "auth.invalid_credentials": "Correo electronico o contrasena incorrectos.",
  "auth.token_expired": "Tu sesion ha expirado. Inicia sesion nuevamente.",
  "auth.token_invalid": "La sesion no es valida. Inicia sesion nuevamente.",
  "auth.forbidden": "No tienes permiso para realizar esta accion.",
  "resource.not_found": "El recurso solicitado no existe.",
  "resource.conflict": "Ya existe un registro con esos datos.",
  "domain.invariant_violated": "La operacion viola una regla del sistema.",
  "wallet.insufficient_funds": "Saldo insuficiente en la cartera.",
  "committee.not_member": "No eres miembro del comite de este congreso.",
  "idempotency.replay": "La solicitud ya fue procesada anteriormente.",
  "system.internal_error": "Ocurrio un error inesperado. Intenta de nuevo mas tarde.",
};
