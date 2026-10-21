import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Bell, CalendarClock, Mail, MessageCircle, Phone, Video } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { listClientView } from "@/server/modules/client-accounts/client-records.service";
import { fmtMoment, initialsOf } from "@/lib/client-format";
import { TicketBoard, type TicketItem } from "@/components/client/TicketBoard";
import styles from "@/components/client/Dashboard.module.css";
import portal from "@/components/client/Portal.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support — SMASH Client Portal", robots: { index: false, follow: false } };

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

/** Your account manager, your tickets and requests (you can raise one and reply), upcoming meetings and the notifications from your team. */
export default async function ClientSupportPage() {
  const { client, db, workspace } = await requirePortalSection("support");
  const tickets = (await listClientView(db, "tickets", client.id)) as unknown as TicketItem[];
  const manager = workspace?.accountManager ?? null;
  const nowIso = new Date().toISOString();
  const meetings = (workspace?.meetings ?? []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const upcoming = meetings.filter((m) => m.startsAt >= nowIso);
  const notifications = workspace?.notifications ?? [];

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageHeadTitle}>Support &amp; communication</h1>
        <p className={styles.pageHeadSub}>Reach your account team, track your requests and see what is coming up.</p>
      </div>

      <div className={portal.stack}>
        {notifications.length ? (
          <section aria-labelledby="notices-heading">
            <h2 id="notices-heading" className="sr-only">Important notifications</h2>
            <div className={portal.notices}>
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className={portal.notice} data-level={n.level}><Bell size={18} strokeWidth={1.9} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} /><div><b>{n.title}</b>{n.body ?? ""}</div></div>
              ))}
            </div>
          </section>
        ) : null}

        <div className={portal.cols}>
          <section className={`${styles.card} ${styles.reveal}`} aria-labelledby="manager-heading">
            <div className={styles.cardHead}><h2 id="manager-heading" className={styles.cardTitle}>Your account manager</h2></div>
            {manager ? (
              <div className={portal.manager}>
                <span className={portal.managerAvatar} aria-hidden="true">{initialsOf(manager.name)}</span>
                <div className={portal.managerInfo}><p className={portal.managerName}>{manager.name}</p><p className={portal.managerRole}>SMASH account team</p></div>
                <div className={portal.contactBtns}>
                  {manager.phone ? <a className={`${portal.btn} ${portal.btnSm}`} href={`tel:${manager.phone}`}><Phone size={14} aria-hidden="true" />Call</a> : null}
                  {manager.whatsapp ? <a className={`${portal.btn} ${portal.btnSm}`} href={waLink(manager.whatsapp)} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" />WhatsApp</a> : null}
                  {manager.email ? <a className={`${portal.btn} ${portal.btnSm}`} href={`mailto:${manager.email}`}><Mail size={14} aria-hidden="true" />Email</a> : null}
                </div>
              </div>
            ) : (
              <p className={portal.allClear}>Your account manager will be listed here. Until then, raise a ticket below and we will reply.</p>
            )}
          </section>

          <section className={`${styles.card} ${styles.reveal}`} style={{ "--d": 1 } as CSSProperties} aria-labelledby="meetings-heading">
            <div className={styles.cardHead}><div><h2 id="meetings-heading" className={styles.cardTitle}>Meetings</h2><p className={styles.cardSub}>Upcoming calls and reviews</p></div></div>
            {upcoming.length === 0 ? (
              <p className={portal.allClear}><span className={portal.todoIcon}><CalendarClock size={18} aria-hidden="true" /></span>No meetings scheduled.</p>
            ) : (
              <div>
                {upcoming.slice(0, 5).map((m) => {
                  const d = new Date(m.startsAt);
                  const day = d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "Asia/Kolkata" });
                  const mon = d.toLocaleDateString("en-GB", { month: "short", timeZone: "Asia/Kolkata" });
                  return (
                    <div key={m.id} className={portal.meet}>
                      <span className={portal.dateBadge} aria-hidden="true"><b>{day}</b><span>{mon}</span></span>
                      <span className={portal.todoText}>{m.title}<small>{fmtMoment(m.startsAt)} IST{m.notes ? ` · ${m.notes}` : ""}</small></span>
                      {m.link ? <a className={`${portal.btn} ${portal.btnSm}`} href={m.link} target="_blank" rel="noopener noreferrer"><Video size={14} aria-hidden="true" />Join</a> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="tickets-heading">
          <div className={styles.sectionHead}><h2 id="tickets-heading" className={styles.sectionTitle}>Support tickets &amp; requests</h2></div>
          <TicketBoard tickets={tickets} />
        </section>
      </div>
    </div>
  );
}
