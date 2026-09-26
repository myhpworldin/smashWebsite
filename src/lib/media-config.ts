/** Runtime media configuration. Not secret: hostnames only. Validated in server/config/env.ts. */
export const isProductionTier = () => process.env.APP_ENV === "production";

/** Hosts (besides this site) that may serve media, e.g. "cdn.example.com" or "*.cdn.example.com". */
export const getMediaHosts = (): string[] =>
  (process.env.MEDIA_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
