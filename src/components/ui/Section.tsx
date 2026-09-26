import type { ReactNode } from "react";
import styles from "./Section.module.css";

/**
 * Vertical rhythm wrapper for a page section. Does not impose a heading or
 * layout — a page section decides its own internal structure; this only
 * standardises the space between sections so pages don't invent one-off values.
 */
export function Section({ children, spacing = "default", className, ariaLabelledBy }: {
  children: ReactNode;
  spacing?: "default" | "tight";
  className?: string;
  ariaLabelledBy?: string;
}) {
  const base = spacing === "tight" ? styles.tight : styles.section;
  return (
    <section className={className ? `${base} ${className}` : base} aria-labelledby={ariaLabelledBy}>
      {children}
    </section>
  );
}
