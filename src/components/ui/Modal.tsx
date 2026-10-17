"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = { open: boolean; onClose: () => void; /** Called once the dialog has fully closed, exit animation included: the moment to move focus somewhere. */ onClosed?: () => void; labelledBy: string; describedBy?: string; children: ReactNode; className?: string };

/** How long the exit animation runs; keep in step with `modal-out` in Modal.module.css. */
const EXIT_MS = 320;

/**
 * The site's one modal: a native `<dialog>` opened with `showModal()`, so the browser provides the focus trap,
 * inert background and focus return to the previously focused element. Children mount only while the dialog is
 * shown, so nothing inside (images included) loads until it opens.
 *
 * It animates both ways: it rises in and, when `open` turns false, plays its exit before the dialog really closes
 * (the children stay mounted until then). Escape and a click on the dimmed backdrop ask the parent to close through
 * `onClose` instead of closing the dialog themselves, so the parent stays the one source of truth. With reduced motion
 * the dialog appears and disappears at once.
 */
export function Modal({ open, onClose, onClosed, labelledBy, describedBy, children, className = "" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // `exiting` is true from the moment `open` turns false until the exit animation has played. It is set while
  // rendering (React's pattern for state that follows a prop) so the children never unmount for even one frame.
  const [exiting, setExiting] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setExiting(!open && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }); // else the browser picks the first control
      return;
    }
    if (!dialog.open) return;
    if (!exiting) {
      dialog.close(); // reduced motion: no exit to wait for
      return;
    }
    const timer = window.setTimeout(() => {
      dialog.close();
      setExiting(false);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, exiting]);

  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${className}`}
      data-closing={exiting ? "" : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault(); // Escape: let the parent decide, so the exit animation can play
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // the dialog has no padding: a click on it itself is a click on the backdrop
      }}
      onClose={() => {
        if (open) onClose(); // closed some other way (e.g. a <form method="dialog">): bring the parent back in step
        else onClosed?.();
      }}
    >
      {open || exiting ? children : null}
    </dialog>
  );
}
