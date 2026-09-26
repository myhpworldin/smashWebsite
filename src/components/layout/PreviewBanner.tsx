import styles from "./PreviewBanner.module.css";

/** Marks a page as preview content (phase brief §25: "indicate that the content is unpublished"). Reached only via `requirePreviewAccess`, so any content shown here may be a draft, not yet public. */
export function PreviewBanner() {
  return <div className={styles.banner} role="status">Preview — this page may show unpublished content. It is not public and is not indexed.</div>;
}
