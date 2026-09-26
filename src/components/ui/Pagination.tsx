import { Button } from "@/components/ui/Button";
import styles from "./Pagination.module.css";

/** Fully server-rendered — plain links to `?page=N`, no client JS (phase brief §24/§29). */
export function Pagination({ page, totalPages, basePath }: { page: number; totalPages: number; basePath: string }) {
  if (totalPages <= 1) return null;
  const hrefFor = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  return (
    <nav aria-label="Pagination" className={styles.nav}>
      {page > 1 ? <Button href={hrefFor(page - 1)} variant="secondary">Previous</Button> : null}
      <span className={styles.status}>Page {page} of {totalPages}</span>
      {page < totalPages ? <Button href={hrefFor(page + 1)} variant="secondary">Next</Button> : null}
    </nav>
  );
}
