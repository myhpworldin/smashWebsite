import "server-only";
import { getEnv } from "@/server/config/env";

const order = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof order;

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|api[-_]?key|cookie|credential|database[-_]?url|mongodb[-_]?uri|connection/i;
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+(:[^\s/@]*)?@/gi;

/** Mask credentials inside URLs and values under sensitive-looking keys, recursively. */
export function redact(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (typeof value === "string") return value.replace(URL_CREDENTIALS, "$1[redacted]@");
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, key, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k, depth + 1)]));
}

/** Structured JSON logs. Never pass request bodies, headers, or personal data in `meta`; it is redacted defensively, not trusted. */
/** Logging must never throw: with an invalid environment it falls back to "info" so the error being reported is still recorded. */
const threshold = (): Level => {
  try {
    return getEnv().LOG_LEVEL;
  } catch {
    return "info";
  }
};

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (order[level] < order[threshold()]) return;
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...(redact(meta) as object | undefined) });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => log("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => log("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => log("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => log("error", m, meta),
};
