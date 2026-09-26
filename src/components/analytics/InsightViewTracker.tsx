"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires `insight_view` once per page view (Stage 4, Phase 6 — mirrors
 * `CaseStudyViewTracker`, same reasoning: a public slug, never the internal
 * id, and a single fire on mount, not on every re-render).
 */
export function InsightViewTracker({ slug, title, category }: { slug: string; title: string; category: string | null }) {
  useEffect(() => {
    trackEvent("insight_view", { insight_slug: slug, insight_title: title, ...(category ? { category } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  return null;
}
