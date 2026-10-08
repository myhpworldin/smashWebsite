import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./SweepLink.module.css";

/**
 * The red/white pill buttons with the colour-swap hover (see SweepLink.module.css). `className` adds per-use
 * styling (weight, responsive visibility).
 */
export function SweepLink({ href, tone, arrow, className = "", children }: { href: string; tone: "red" | "white"; arrow?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${styles.link} ${styles[tone]} ${className}`}>
      {children}
      {arrow ? <span aria-hidden="true" className={styles.arrow} /> : null}
    </Link>
  );
}
