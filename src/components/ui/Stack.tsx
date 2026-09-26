import type { ElementType, ReactNode } from "react";
import styles from "./Stack.module.css";

type SpaceToken = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Flex layout primitive. `gap` references the spacing scale (src/app/globals.css) — never a literal pixel value. */
export function Stack({ as: As = "div", direction = "column", gap = 4, align, justify, wrap, children, className }: {
  as?: ElementType;
  direction?: "column" | "row";
  gap?: SpaceToken;
  align?: string;
  justify?: string;
  wrap?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const base = `${styles.stack} ${direction === "row" ? styles.row : styles.column}`;
  return (
    <As
      className={className ? `${base} ${className}` : base}
      style={{ gap: `var(--space-${gap})`, alignItems: align, justifyContent: justify, flexWrap: wrap === false ? "nowrap" : undefined }}
    >
      {children}
    </As>
  );
}
