"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import Link from "next/link";
import styles from "./AdminDropdownMenu.module.css";

/**
 * A small anchored action menu (the "⋯" overflow menu) — not built on the shared `Modal`
 * (native `<dialog>`): that component is a true modal with backdrop/focus-trap/inert-background,
 * which is the wrong interaction for a lightweight popover anchored to its trigger button.
 */
export function AdminDropdownMenu({ label, align = "end", children }: { label: string; align?: "start" | "end"; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div id={menuId} role="menu" className={`${styles.menu} ${styles[align]}`} data-open={open} aria-hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}

type ItemProps = { children: ReactNode; destructive?: boolean } & ({ onClick: () => void; href?: undefined } | { href: string; onClick?: undefined });

export function AdminDropdownMenuItem({ children, destructive, onClick, href }: ItemProps) {
  const cls = destructive ? `${styles.item} ${styles.destructive}` : styles.item;
  if (href) {
    return (
      <Link href={href} role="menuitem" className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
