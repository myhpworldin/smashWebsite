import type { Metadata } from "next";
import { Image as ImageIcon } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { listClientView } from "@/server/modules/client-accounts/client-records.service";
import { ContentBoard, type ContentItem } from "@/components/client/ContentBoard";
import styles from "@/components/client/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Content — SMASH Client Portal", robots: { index: false, follow: false } };

/** Posts, videos and designs for this client to approve, with a calendar of what goes live when. They can approve, ask for changes or reject; everything else is read-only. */
export default async function ClientContentPage() {
  const { client, db } = await requirePortalSection("content");
  const items = (await listClientView(db, "creatives", client.id)) as unknown as ContentItem[];
  const waiting = items.filter((i) => i.status === "PENDING").length;
  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageHeadTitle}>Content</h1>
        <p className={styles.pageHeadSub}>{waiting ? `${waiting} item${waiting === 1 ? " is" : "s are"} waiting for your approval.` : "Review and approve the content your SMASH team creates for you."}</p>
      </div>
      {items.length ? (
        <ContentBoard items={items} />
      ) : (
        <div className={`${styles.empty} ${styles.reveal}`}>
          <span className={styles.emptyIcon}><ImageIcon size={30} strokeWidth={1.7} aria-hidden="true" /></span>
          <h2 className={styles.emptyTitle}>No content to review yet</h2>
          <p className={styles.emptyText}>When your team sends you a post, reel or design to approve, it will appear here.</p>
        </div>
      )}
    </div>
  );
}
