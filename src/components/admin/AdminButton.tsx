import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import styles from "./AdminButton.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "onDark";
type Common = { variant?: Variant; size?: "md" | "sm"; children: ReactNode; className?: string; loading?: boolean };
type AsLink = Common & { href: string };
type AsButton = Common & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/**
 * The CRM's one button: a navy gradient primary (with the portal's light sweep on hover), outlined secondary, quiet ghost, danger, and
 * `onDark` for the page hero. A `href` renders a real link; otherwise a real `<button>`.
 */
export function AdminButton(props: AsLink | AsButton) {
  const { variant = "primary", size = "md", className, loading, children } = props;
  const cls = [styles.btn, styles[variant], size === "sm" ? styles.small : "", className ?? ""].filter(Boolean).join(" ");
  const inner = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </>
  );
  if (props.href !== undefined) {
    return <Link href={props.href} className={cls} aria-disabled={loading || undefined}>{inner}</Link>;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude them from `rest`
  const { variant: _v, size: _s, className: _c, loading: _l, children: _ch, type, disabled, ...rest } = props as AsButton;
  return <button type={type ?? "button"} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{inner}</button>;
}
