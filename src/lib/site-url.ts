/** Public site origin. NEXT_PUBLIC_* is browser-safe by definition; validation lives in server/config/env.ts. */
export const DEFAULT_SITE_URL = "http://localhost:3000";
export const getSiteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
