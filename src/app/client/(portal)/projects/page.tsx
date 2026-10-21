import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { listClientView } from "@/server/modules/client-accounts/client-records.service";
import { istDay } from "@/lib/client-dates";
import { PROJECT_STATUS_LABEL } from "@/lib/client-options";
import { ProjectBoard } from "@/components/client/ProjectBoard";
import styles from "@/components/client/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects — SMASH Client Portal", robots: { index: false, follow: false } };

type Project = { id: string; name: string; serviceType: string | null; startDate: string | null; team: string[]; status: keyof typeof PROJECT_STATUS_LABEL; expectedCompletion: string | null; notes: string | null };
const DAY = 86_400_000;

/** How far through its dates a project is, and what to say about it. A finished project is full; one past its date and not finished is flagged rather than shown as "100%". */
function timeline(p: Project, today: string) {
  if (p.status === "COMPLETED") return { pct: 100, tone: "ok" as const, text: "Completed" };
  if (!p.startDate || !p.expectedCompletion) return null;
  const start = Date.parse(`${p.startDate}T00:00:00Z`), end = Date.parse(`${p.expectedCompletion}T00:00:00Z`), now = Date.parse(`${today}T00:00:00Z`);
  const left = Math.round((end - now) / DAY);
  if (left < 0) return { pct: 100, tone: "bad" as const, text: `${-left} day${left === -1 ? "" : "s"} past the expected date` };
  const pct = end > start ? Math.max(2, Math.min(100, Math.round(((now - start) / (end - start)) * 100))) : 100;
  return { pct, tone: undefined, text: left === 0 ? "Due today" : `${left} day${left === 1 ? "" : "s"} to go` };
}

/** Every project SMASH is running for this client: what, who is on it, where it stands and when it should land. Read-only. */
export default async function ClientProjectsPage() {
  const { client, db } = await requirePortalSection("projects");
  const projects = (await listClientView(db, "projects", client.id)) as unknown as Project[];
  const today = istDay(new Date());
  const ordered = [...projects].sort((a, b) => Number(a.status === "COMPLETED") - Number(b.status === "COMPLETED"));

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageHeadTitle}>Projects</h1>
        <p className={styles.pageHeadSub}>What your SMASH team is working on for {client.companyName}.</p>
      </div>
      {ordered.length ? (
        <ProjectBoard projects={ordered.map((p) => ({ ...p, progress: timeline(p, today) }))} />
      ) : (
        <div className={`${styles.empty} ${styles.reveal}`}>
          <span className={styles.emptyIcon}><Briefcase size={30} strokeWidth={1.7} aria-hidden="true" /></span>
          <h2 className={styles.emptyTitle}>No projects yet</h2>
          <p className={styles.emptyText}>When your SMASH team starts a project for you, you will see its status and dates here.</p>
        </div>
      )}
    </div>
  );
}
