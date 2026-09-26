import { z } from "zod";
import { SLUG_PATTERN } from "@/server/seo/slug";
import { AppError } from "@/server/lib/errors";
import { zodFields } from "@/server/lib/response";

export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 12;

/** `?page=1&limit=12`. Out-of-range values are rejected (422), never silently clamped. */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

/** Printable text only: control characters (including NUL, which is unsafe to store) are refused. */
export const printable = z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/, "Contains control characters");

export const insightsQuerySchema = pageQuerySchema.extend({ category: printable.optional() });

/** Only known parameters are read (unknown ones are ignored); a repeated parameter is ambiguous and rejected. */
export function parseQuery<S extends z.ZodType>(schema: S, url: URL): z.output<S> {
  const raw: Record<string, string> = {};
  const repeated: Record<string, string> = {};
  for (const [k, v] of url.searchParams) {
    if (k in raw) repeated[k] = "Provide this parameter only once.";
    raw[k] = v;
  }
  if (Object.keys(repeated).length) throw AppError.validation(repeated);
  const result = schema.safeParse(raw);
  if (!result.success) throw AppError.validation(zodFields(result.error));
  return result.data;
}

/** Format check only (Phase 3 rules). Unknown, draft and renamed slugs are 404s, never redirects. */
export function parseSlug(value: string | undefined): string {
  if (!value || value.length > 100 || !SLUG_PATTERN.test(value)) throw AppError.badRequest("Malformed slug.");
  return value;
}

export const pageMeta = (total: number, page: number, limit: number) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });
export type PaginationMeta = ReturnType<typeof pageMeta>;
