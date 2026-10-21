"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, RefreshCw } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { istStamp, localStamp, relativeTime } from "@/lib/client-time";
import styles from "./Freshness.module.css";

/** Figures counted as "fresh" (a glowing badge) for this long after they were published. */
const FRESH_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 60_000;

/** Re-renders every `ms` (for a "3 min ago" that keeps itself true). */
function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * The dashboard's headline "when was this last updated". It shows the exact time of the last publish (in the viewer's own time
 * zone once the page is up, IST before that so the server and browser agree), how long ago that was, a glowing badge while the
 * figures are under a day old, and a "New" tag when an admin has published since the client last looked. While the page is open
 * it asks the server once a minute and, if newer figures exist, offers a one-click refresh instead of leaving stale numbers on
 * screen. After a few seconds on the page it records the visit, which is what clears "New" next time.
 */
export function FreshnessBadge({ updatedAt, isNew, preview }: { updatedAt: string | null; isNew: boolean; /** An administrator previewing the portal: no signed-in client, so nothing is recorded or polled. */ preview?: boolean }) {
  const router = useRouter();
  const now = useNow(30_000);
  const [stamp, setStamp] = useState<string | null>(updatedAt ? istStamp(new Date(updatedAt)) : null);
  const [latest, setLatest] = useState<string | null>(updatedAt);

  useEffect(() => {
    // The browser's own zone is only knowable after mount; before that the server's IST text stays, so hydration matches.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to the viewer's time zone, unknowable during SSR
    setStamp(updatedAt ? localStamp(new Date(updatedAt)) : null);
  }, [updatedAt]);

  useEffect(() => {
    if (preview) return;
    const seen = setTimeout(() => void apiFetch("/api/client/seen", { method: "POST" }).catch(() => null), 4000);
    return () => clearTimeout(seen);
  }, [preview]);

  useEffect(() => {
    if (preview) return;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const result = await apiFetch<{ dataUpdatedAt: string | null }>("/api/client/updates");
        if (isApiSuccess(result)) setLatest(result.data.dataUpdatedAt);
      } catch {
        // Offline or a blip: try again next minute.
      }
    };
    const t = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [preview]);

  const date = updatedAt ? new Date(updatedAt) : null;
  const fresh = date ? now.getTime() - date.getTime() < FRESH_MS : false;
  const newer = latest && updatedAt && new Date(latest).getTime() > new Date(updatedAt).getTime();

  return (
    <div>
      <div className={styles.badge} data-fresh={fresh || undefined} role="status" aria-live="polite">
        <span className={styles.top}>
          <span className={styles.dot} data-idle={!date || undefined} aria-hidden="true" />
          {date ? "Data last updated" : "Waiting for your first update"}
          {isNew && date ? <span className={styles.new}>New</span> : null}
        </span>
        {date ? (
          <>
            <span className={styles.stamp} suppressHydrationWarning>{stamp}</span>
            <span className={styles.ago} suppressHydrationWarning>{relativeTime(date, now)}</span>
          </>
        ) : (
          <span className={styles.ago}>Your account team will publish your figures here.</span>
        )}
      </div>
      {newer ? (
        <button type="button" className={styles.refresh} onClick={() => router.refresh()}>
          <RefreshCw size={14} strokeWidth={2.2} aria-hidden="true" />
          New figures are available — refresh
        </button>
      ) : null}
    </div>
  );
}

/** The small "Updated 3 hours ago" chip at the top of a section, so every block of numbers says how current it is. */
export function UpdatedChip({ updatedAt }: { updatedAt: string | null }) {
  const now = useNow(60_000);
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  const fresh = now.getTime() - date.getTime() < FRESH_MS;
  return (
    <span className={styles.chip} data-fresh={fresh || undefined} title={`Last updated ${istStamp(date)}`}>
      {fresh ? <span className={styles.chipDot} aria-hidden="true" /> : <Clock3 size={13} strokeWidth={2} aria-hidden="true" />}
      <span suppressHydrationWarning>Updated {relativeTime(date, now)}</span>
    </span>
  );
}
