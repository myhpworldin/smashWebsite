"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import styles from "./ClientPicker.module.css";

/**
 * The dashboard's client list with a search box over it. Each card is rendered on the server and handed in as `card`; this only decides
 * which ones to show, matching the search against the company, contact and login email.
 */
export function ClientPicker({ items }: { items: { id: string; text: string; card: ReactNode }[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => i.text.toLowerCase().includes(q)) : items;
  return (
    <>
      <div className={styles.search}>
        <Search size={17} strokeWidth={2} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a client by company, contact or email" aria-label="Find a client" className={styles.searchInput} />
        {q ? <span className={styles.searchCount} aria-live="polite">{shown.length} of {items.length}</span> : null}
      </div>
      {shown.length ? (
        <div className={styles.grid}>{shown.map((i) => <div key={i.id} className={styles.cell}>{i.card}</div>)}</div>
      ) : (
        <p className={styles.noMatch}>No client matches &ldquo;{query.trim()}&rdquo;.</p>
      )}
    </>
  );
}
