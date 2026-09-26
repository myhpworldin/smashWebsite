import type { ElementType, ReactNode } from "react";
import styles from "./Container.module.css";

/** Caps content width and applies consistent inline padding. The one layout primitive every page/section uses. */
export function Container({ as: As = "div", children, className }: { as?: ElementType; children: ReactNode; className?: string }) {
  return <As className={className ? `${styles.container} ${className}` : styles.container}>{children}</As>;
}
