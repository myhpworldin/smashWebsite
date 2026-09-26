import Link from "next/link";
import type { Crumb } from "@/server/seo/breadcrumbs";
import styles from "./Breadcrumbs.module.css";

/**
 * Renders exactly the crumb list `buildBreadcrumbs` produces
 * (src/server/seo/breadcrumbs.ts) — the same function that feeds
 * `breadcrumbJsonLd`, so the visible trail and the BreadcrumbList schema can
 * never disagree (phase brief §23).
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className={styles.list}>
        {crumbs.map((crumb, i) => {
          const key = crumb.path ?? crumb.name;
          if (i === crumbs.length - 1) return <li key={key} className={styles.current} aria-current="page">{crumb.name}</li>;
          // No live page to link to (e.g. a "Services" hub crumb before that page exists) — plain text, never a link that would 404.
          if (!crumb.path) return <li key={key}>{crumb.name}</li>;
          return <li key={key}><Link href={crumb.path}>{crumb.name}</Link></li>;
        })}
      </ol>
    </nav>
  );
}
