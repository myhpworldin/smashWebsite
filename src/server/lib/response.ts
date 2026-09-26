import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, type ErrorCode, type FieldErrors } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";

/**
 * The single place errors become HTTP responses. Envelope:
 *   success  { success: true,  data, meta? }
 *   failure  { success: false, message, error: { code, fields? } }
 * Clients only ever receive the AppError message, its code and per-field
 * messages. Stack traces, SQL/driver errors, paths and configuration stay in the
 * server log, in every environment.
 */
export function ok<T>(data: T, init?: ResponseInit & { meta?: Record<string, unknown> }) {
  const { meta, ...rest } = init ?? {};
  return NextResponse.json(meta ? { success: true, data, meta } : { success: true, data }, rest);
}

/** The two shapes every public endpoint returns; see CONTENT_CONTRACTS.md. */
export type ApiSuccess<T, M = undefined> = M extends undefined ? { success: true; data: T } : { success: true; data: T; meta: M };
export type ApiFailure = { success: false; message: string; error: { code: string; fields?: FieldErrors } };

const PUBLIC_CODE: Record<ErrorCode, string> = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "RESOURCE_NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

const NO_STORE = { "Cache-Control": "no-store" };

export type RequestContext = { method?: string; path?: string };

export function zodFields(err: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of err.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
  return fields;
}

export function fail(err: unknown, opts: { headers?: Record<string, string>; request?: RequestContext } = {}) {
  const headers = { ...NO_STORE, ...opts.headers };
  const request = opts.request ?? {};
  const appError = err instanceof ZodError ? AppError.validation(zodFields(err)) : err instanceof AppError ? err : null;

  if (appError) {
    // 404s are routine (crawlers, stale links) and 429s are logged where they are decided.
    if (appError.status === 400 || appError.status === 422 || appError.status === 409) {
      logger.info("Request rejected", { ...request, status: appError.status, code: PUBLIC_CODE[appError.code] });
    }
    return NextResponse.json(
      { success: false, message: appError.message, error: { code: PUBLIC_CODE[appError.code], ...(appError.fields ? { fields: appError.fields } : {}) } },
      { status: appError.status, headers },
    );
  }

  logger.error("Unhandled error", {
    ...request,
    name: err instanceof Error ? err.name : typeof err,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json(
    { success: false, message: "Something went wrong.", error: { code: PUBLIC_CODE.INTERNAL_ERROR } },
    { status: 500, headers },
  );
}
