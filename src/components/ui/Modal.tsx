"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = { open: boolean; onClose: () => void; labelledBy: string; describedBy?: string; children: ReactNode; className?: string };

/**
 * The site's one modal: a native `<dialog>` opened with `showModal()`, so the browser provides the focus trap,
 * inert background, Escape-to-close and focus return to the previously focused element. Children mount only
 * while open, so nothing inside (images included) loads until the dialog is actually shown.
 */
export function Modal({ open, onClose, labelledBy, describedBy, children, className = "" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={`${styles.modal} ${className}`} aria-labelledby={labelledBy} aria-describedby={describedBy} onClose={onClose}>
      {open ? children : null}
    </dialog>
  );
}
