import type { CtaPublic } from "@/server/api/sections";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { ROUTES } from "@/lib/routes";

/**
 * The public `Cta` shape (`{label, target, external}` — API.md, HOME_PAGE_CONTRACT.md) rendered as a Button.
 * Tracking (Stage 4, Phase 5): a CTA whose real, stored target is `/contact` is the site's one objectively
 * identifiable "intent to talk to SMASH" action — tracked as `book_strategy_call` (ANALYTICS_EVENTS.md), the
 * named conversion event the project defines, rather than guessing from a CTA's editor-authored label text.
 * Every other CTA still fires the generic `cta_click` interaction event, so nothing goes untracked.
 */
export function CtaButton({ cta, variant }: { cta: CtaPublic; variant?: ButtonProps["variant"] }) {
  if (!cta) return null;
  const trackEvent = { name: cta.target === ROUTES.CONTACT ? "book_strategy_call" : "cta_click", params: { cta_label: cta.label, cta_target: cta.target } };
  const label = (
    <>
      {cta.label}
      {variant === "primary" ? <span aria-hidden="true">→</span> : null}
    </>
  );
  return cta.external ? (
    <Button href={cta.target} external variant={variant} trackEvent={trackEvent}>{label}</Button>
  ) : (
    <Button href={cta.target} variant={variant} trackEvent={trackEvent}>{label}</Button>
  );
}
