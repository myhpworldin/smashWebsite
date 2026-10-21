"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, CalendarDays, X } from "lucide-react";
import { PROJECT_STATUS_LABEL } from "@/lib/client-options";
import { fmtDay, initialsOf } from "@/lib/client-format";
import { StatusPill, type PillTone } from "./StatusPill";
import portal from "./Portal.module.css";

export type ProjectItem = {
  id: string; name: string; serviceType: string | null; startDate: string | null; team: string[]; status: keyof typeof PROJECT_STATUS_LABEL; expectedCompletion: string | null; notes: string | null;
  /** How far through its dates the project is, worked out on the server (so "today" is India's day): `null` when it has no dates to measure. */
  progress: { pct: number; tone?: "ok" | "bad"; text: string } | null;
};

const TONE: Record<string, PillTone> = { PLANNING: "neutral", IN_PROGRESS: "info", IN_REVIEW: "warn", ON_HOLD: "bad", COMPLETED: "ok" };
const MEANING: Record<string, string> = {
  PLANNING: "We are scoping the work and getting ready to start.",
  IN_PROGRESS: "Your team is actively working on this.",
  IN_REVIEW: "The work is done and is being checked before it is delivered.",
  ON_HOLD: "Work is paused for now. Your account manager can tell you why and when it restarts.",
  COMPLETED: "This project has been delivered.",
};

/**
 * The projects as cards; each card opens a detail panel with everything about it (status explained, dates, progress, the whole team, the full
 * note) and a shortcut to ask the team about it. The whole card is the target: its title is a real button stretched over the card, so a
 * click anywhere works, and keyboard and screen-reader users reach it as an ordinary button. The panel is a native modal `<dialog>`, which
 * provides the focus trap, Escape to close and the backdrop; clicking the backdrop closes it too.
 */
export function ProjectBoard({ projects }: { projects: ProjectItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = projects.find((p) => p.id === openId) ?? null;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // The page behind a modal must not scroll; put it back (and the focus) when the panel closes.
  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = previous; opener.current?.focus(); };
  }, [open]);

  return (
    <>
      <div className={portal.projects}>
        {projects.map((p, i) => (
          <article key={p.id} className={`${portal.project} ${portal.projectCard}`} style={{ "--i": i } as CSSProperties}>
            <div className={portal.projectHead}>
              <div>
                <h2 className={portal.projectName}>
                  <button type="button" className={portal.projectOpen} aria-haspopup="dialog" onClick={(e) => { opener.current = e.currentTarget; setOpenId(p.id); }}>{p.name}</button>
                </h2>
                {p.serviceType ? <p className={portal.projectType}>{p.serviceType}</p> : null}
              </div>
              <StatusPill label={PROJECT_STATUS_LABEL[p.status]} tone={TONE[p.status]} live={p.status === "IN_PROGRESS"} />
            </div>
            {p.progress ? (
              <div className={portal.timeline}>
                <div className={portal.timelineTop}><span>{p.progress.text}</span><b>{p.status === "COMPLETED" ? "Done" : `${p.progress.pct}%`}</b></div>
                <span className={portal.bar} role="img" aria-label={p.progress.text}><span className={portal.barFill} data-tone={p.progress.tone} style={{ "--pct": `${p.progress.pct}%` } as CSSProperties} /></span>
              </div>
            ) : null}
            <div className={portal.dates}>
              <span>Started<b>{fmtDay(p.startDate)}</b></span>
              <span>Expected completion<b>{fmtDay(p.expectedCompletion)}</b></span>
            </div>
            {p.team.length ? (
              <div className={portal.team}>
                <span className={portal.avatars} aria-hidden="true">{p.team.slice(0, 4).map((n) => <span key={n} className={portal.av} title={n}>{initialsOf(n)}</span>)}</span>
                <span className={portal.teamNames}>{p.team.join(", ")}</span>
              </div>
            ) : null}
            {p.notes ? <p className={`${portal.projectNote} ${portal.clamp}`}>{p.notes}</p> : null}
            <span className={portal.projectMore} aria-hidden="true">View details <ArrowRight size={15} strokeWidth={2.2} /></span>
          </article>
        ))}
      </div>

      <dialog
        ref={dialog}
        className={portal.sheet}
        aria-labelledby="project-sheet-title"
        onClose={() => setOpenId(null)}
        onClick={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}
      >
        {open ? (
          <div className={portal.sheetBody}>
            <button type="button" className={portal.sheetClose} aria-label="Close project details" onClick={() => setOpenId(null)}><X size={18} strokeWidth={2.2} aria-hidden="true" /></button>
            <p className={portal.sheetEyebrow}>{open.serviceType ?? "Project"}</p>
            <h2 id="project-sheet-title" className={portal.sheetTitle}>{open.name}</h2>
            <div className={portal.sheetStatus}>
              <StatusPill label={PROJECT_STATUS_LABEL[open.status]} tone={TONE[open.status]} live={open.status === "IN_PROGRESS"} />
              <span>{MEANING[open.status]}</span>
            </div>

            {open.progress ? (
              <div className={portal.timeline}>
                <div className={portal.timelineTop}><span>{open.progress.text}</span><b>{open.status === "COMPLETED" ? "Done" : `${open.progress.pct}%`}</b></div>
                <span className={portal.bar} role="img" aria-label={open.progress.text}><span className={portal.barFill} data-tone={open.progress.tone} style={{ "--pct": `${open.progress.pct}%` } as CSSProperties} /></span>
              </div>
            ) : null}

            <dl className={portal.sheetFacts}>
              <div><dt><CalendarDays size={14} aria-hidden="true" />Started</dt><dd>{fmtDay(open.startDate)}</dd></div>
              <div><dt><CalendarDays size={14} aria-hidden="true" />Expected completion</dt><dd>{fmtDay(open.expectedCompletion)}</dd></div>
            </dl>

            {open.team.length ? (
              <section aria-labelledby="project-sheet-team">
                <h3 id="project-sheet-team" className={portal.sheetHeading}>Your team on this project</h3>
                <ul className={portal.sheetTeam}>
                  {open.team.map((n) => <li key={n}><span className={portal.av} aria-hidden="true">{initialsOf(n)}</span>{n}</li>)}
                </ul>
              </section>
            ) : null}

            {open.notes ? (
              <section aria-labelledby="project-sheet-notes">
                <h3 id="project-sheet-notes" className={portal.sheetHeading}>Notes from your team</h3>
                <p className={portal.sheetNotes}>{open.notes}</p>
              </section>
            ) : null}

            <Link href="/client/support" className={portal.sheetAsk}>Ask about this project <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" /></Link>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
