/**
 * Convenience re-exports only — every type here is defined once, next to the
 * function that produces it (CONTENT_CONTRACTS.md §3), never redeclared here.
 * `import type` is erased at compile time, so importing this file has no
 * runtime cost and does not pull in `server-only` code even though the source
 * files do (see FRONTEND_INTEGRATION.md §2).
 */
export type {
  ServiceSummary,
  ServiceDetail,
  CaseStudySummary,
  CaseStudyDetail,
  InsightSummary,
  InsightDetail,
  Testimonial,
  Client,
  CareerSummary,
  CareerDetail,
  SiteSettingsPublic,
  PublicSeo,
} from "@/server/api/serializers";
export type { HomeResponse } from "@/server/api/home.dto";
export type { HeroSection } from "@/server/api/sections";
export type { ApiSuccess, ApiFailure } from "@/server/lib/response";
export type { PaginationMeta } from "@/server/api/query";
export type { PublicMedia, PublicVideo } from "@/server/media/public";
