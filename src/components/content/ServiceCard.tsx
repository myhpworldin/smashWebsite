import Link from "next/link";
import type { ServiceSummary } from "@/server/api/serializers";
import { Media } from "@/components/ui/Media";
import styles from "./Card.module.css";

/** Renders a `ServiceSummary` (GET /api/services, Home "services" section) exactly as the API returns it — no invented fields. */
export function ServiceCard({ service }: { service: ServiceSummary }) {
  return (
    <Link href={service.path} className={styles.card}>
      <Media media={service.image} />
      <h3 className={styles.title}>{service.name}</h3>
      <p className={styles.description}>{service.shortDescription}</p>
    </Link>
  );
}
