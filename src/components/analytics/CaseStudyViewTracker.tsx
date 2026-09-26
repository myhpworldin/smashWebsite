"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires `case_study_view` once per page view (phase brief §17). A public
 * slug, not the internal database id, is the stable identifier sent — the
 * page itself never has the id at all (`caseStudyDetailDto` never includes
 * it). Rendered as an invisible child of the page, not a wrapper, so it adds
 * no DOM/layout of its own.
 */
export function CaseStudyViewTracker({ slug, title, industry }: { slug: string; title: string; industry: string | null }) {
  useEffect(() => {
    trackEvent("case_study_view", { case_study_slug: slug, case_study_name: title, ...(industry ? { industry } : {}) });
    // Intentionally slug-only deps: this must fire once per mounted case study, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  return null;
}
