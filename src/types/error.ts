export type ErrorCode =
  | "validation.failed"
  | "auth.invalid_credentials"
  | "auth.token_expired"
  | "auth.token_invalid"
  | "auth.forbidden"
  | "resource.not_found"
  | "resource.conflict"
  | "domain.invariant_violated"
  | "wallet.insufficient_funds"
  | "committee.not_member"
  | "idempotency.replay"
  | "system.internal_error";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "ApplicationError";
  }
}
