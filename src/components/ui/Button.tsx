import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "link";
/** Read by the delegated click listener in `Analytics.tsx` — plain `data-*` attributes, no client JS added to this component. */
type TrackEvent = { name: string; params?: Record<string, string> };
type Common = { variant?: Variant; children: ReactNode; className?: string; loading?: boolean; trackEvent?: TrackEvent };

/** Internal navigation — always a real link, never a <button> pretending to navigate (phase brief §18). */
type AsInternalLink = Common & { href: string; external?: false };
/** External navigation — a real link with the correct rel/target so the browser and screen readers behave correctly. */
type AsExternalLink = Common & { href: string; external: true };
/** An action with no navigation target — a real <button>. */
type AsButton = Common & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export type ButtonProps = AsInternalLink | AsExternalLink | AsButton;

const variantClass = (variant: Variant = "primary") => styles[variant];

/**
 * The one Button implementation for the whole site (phase brief §18/§29 — do
 * not create a second button per page). A `href` always renders a link with
 * correct semantics; omitting it renders a real `<button>`. Visual variants are
 * token-driven (globals.css) so the designer's approved values apply everywhere
 * at once.
 */
/** `undefined` when there's nothing to track, so no empty `data-track-*` attributes ever render. */
const trackingAttrs = (trackEvent?: TrackEvent) =>
  trackEvent ? { "data-track-event": trackEvent.name, "data-track-params": trackEvent.params ? JSON.stringify(trackEvent.params) : undefined } : {};

export function Button(props: ButtonProps) {
  const cls = `${styles.button} ${variantClass(props.variant)}${props.className ? ` ${props.className}` : ""}`;

  if (props.href && props.external) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude them from `rest`
    const { href, children, variant, className, loading, trackEvent, ...rest } = props;
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" aria-disabled={loading || undefined} {...trackingAttrs(trackEvent)} {...rest}>
        {children}
      </a>
    );
  }
  if (props.href) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude them from `rest`
    const { href, children, variant, className, loading, trackEvent, ...rest } = props;
    return (
      <Link href={href} className={cls} aria-disabled={loading || undefined} {...trackingAttrs(trackEvent)} {...rest}>
        {children}
      </Link>
    );
  }
  // Both link branches above return, so only AsButton remains; TS can't prove that through the
  // compound `props.href && props.external` guard, so it's asserted here rather than fought.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude them from `rest`
  const { children, variant, className, loading, disabled, type, trackEvent, ...rest } = props as AsButton;
  return (
    <button type={type ?? "button"} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...trackingAttrs(trackEvent)} {...rest}>
      {children}
    </button>
  );
}
