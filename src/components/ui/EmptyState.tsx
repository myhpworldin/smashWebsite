import styles from "./EmptyState.module.css";

/**
 * The one place a "nothing to show" state is rendered (phase brief §25). The
 * default message is deliberately neutral — never invented marketing copy;
 * a page may pass its own approved wording once content/design defines it.
 */
export function EmptyState({ message = "Nothing to show here yet." }: { message?: string }) {
  return <p className={styles.empty}>{message}</p>;
}
