import styles from "./Skeleton.module.css";

/** Generic loading placeholder. Respects prefers-reduced-motion (no pulse animation when set). */
export function Skeleton({ width = "100%", height = "1rem", className }: { width?: string; height?: string; className?: string }) {
  return (
    <span
      className={className ? `${styles.skeleton} ${className}` : styles.skeleton}
      style={{ width, height }}
      role="presentation"
      aria-hidden="true"
    />
  );
}
