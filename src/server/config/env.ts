import "server-only";
import { z } from "zod";
import { DEFAULT_SITE_URL } from "@/lib/site-url";

// Empty strings (as in .env.example) are treated as unset.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.url().default(DEFAULT_SITE_URL),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  /** MongoDB connection string, e.g. mongodb://127.0.0.1:27017/smash or a mongodb+srv:// Atlas URI. SECRET when it carries credentials. */
  MONGODB_URI: optional(z.string().refine((v) => /^mongodb(\+srv)?:\/\//.test(v), "Must start with mongodb:// or mongodb+srv://")),
  /** Database name; defaults to the one in MONGODB_URI's path. */
  MONGODB_DB: optional(z.string()),
  /** Comma-separated hostnames allowed to serve media besides this site, e.g. "cdn.example.com,*.img.example.com". */
  MEDIA_ALLOWED_HOSTS: optional(
    z.string().refine(
      (v) => v.split(",").every((h) => /^(\*\.)?[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i.test(h.trim())),
      "Comma-separated hostnames only (no scheme or path)",
    ),
  ),
  /**
   * SECRET: bearer token for the admin content-management API (Stage 4, Phase 2 —
   * `src/server/api/admin-auth.ts`). Unset means the admin API is disabled (every
   * admin request gets a safe 500 naming the problem), never "open by default".
   * A short shared secret is guessable, hence the length floor.
   */
  ADMIN_API_TOKEN: optional(z.string().min(32, "Must be at least 32 characters")),
  /**
   * SECRET, optional: a second bearer token for the "Content Editor" role (Stage 5,
   * Phase 1 — minimum role separation, `admin-auth.ts`). Unset means only the
   * Administrator role exists (unchanged from Phase 2's single-secret design).
   */
  CMS_EDITOR_API_TOKEN: optional(z.string().min(32, "Must be at least 32 characters")),
}).superRefine((env, ctx) => {
  if (!URL.canParse(env.NEXT_PUBLIC_SITE_URL)) return; // already reported by the field check; do not throw here
  // Canonical URLs are built from this value, so production must not fall back to localhost.
  const url = new URL(env.NEXT_PUBLIC_SITE_URL);
  const bad = (message: string) => ctx.addIssue({ code: "custom", path: ["NEXT_PUBLIC_SITE_URL"], message });
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  // A tier that serves real traffic must have a database; failing here names the variable instead of 500-ing every page.
  if (env.APP_ENV !== "development" && !env.MONGODB_URI) ctx.addIssue({ code: "custom", path: ["MONGODB_URI"], message: "Required in staging and production" });
  if (env.CMS_EDITOR_API_TOKEN && !env.ADMIN_API_TOKEN) ctx.addIssue({ code: "custom", path: ["CMS_EDITOR_API_TOKEN"], message: "Requires ADMIN_API_TOKEN to also be set" });
  if (env.CMS_EDITOR_API_TOKEN && env.ADMIN_API_TOKEN === env.CMS_EDITOR_API_TOKEN) {
    ctx.addIssue({ code: "custom", path: ["CMS_EDITOR_API_TOKEN"], message: "Must be different from ADMIN_API_TOKEN, or the roles are not actually separated" });
  }
  if (env.APP_ENV === "staging" && (url.protocol !== "https:" || local)) bad("Staging requires an https, non-localhost origin");
  if (env.APP_ENV !== "production") return;
  if (url.protocol !== "https:" || local) bad("Production requires the public https origin");
  else if (url.pathname !== "/" || url.search || url.hash || url.username) bad("Must be the bare origin (no path, query or credentials)");
  else if (/^(www|staging|stage|dev|test|preview)\./i.test(url.hostname)) bad("Must be the canonical production domain, not a www, staging or preview host");
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validated, server-only environment. Throws once with a readable message if invalid. */
export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid environment configuration: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}
