export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/** Field name → human-readable problem. The only structured detail a client ever receives. */
export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string) {
    return new AppError("BAD_REQUEST", 400, message);
  }
  static unauthorized() {
    return new AppError("UNAUTHORIZED", 401, "Authentication is required.");
  }
  static forbidden(message = "You do not have access to this resource.") {
    return new AppError("FORBIDDEN", 403, message);
  }
  static notFound(what = "resource") {
    return new AppError("NOT_FOUND", 404, `The requested ${what.toLowerCase()} was not found.`);
  }
  static methodNotAllowed(allow: string) {
    return new AppError("METHOD_NOT_ALLOWED", 405, `Method not allowed. Allowed: ${allow}.`);
  }
  static conflict(message: string) {
    return new AppError("CONFLICT", 409, message);
  }
  static validation(fields: FieldErrors) {
    return new AppError("VALIDATION_ERROR", 422, "Invalid request data.", fields);
  }
}
