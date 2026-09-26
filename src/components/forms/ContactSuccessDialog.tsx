"use client";

import Image from "next/image";
import { Asset } from "@/components/home/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ROUTES } from "@/lib/routes";
import styles from "./ContactSuccessDialog.module.css";

/** Confirmation shown only after `POST /api/contact` has actually succeeded (Figma "Confirmation Card"). */
export function ContactSuccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="contact-success-title" describedBy="contact-success-text">
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <Asset name="close.svg" width={26} height={26} />
      </button>
      <div className={styles.art} aria-hidden="true">
        <Asset name="contact-success-sparkles.svg" width={205} height={140} className={styles.sparkles} />
        <Image src="/media/figma/contact-success-tick.png" alt="" width={110} height={110} className={styles.tick} />
      </div>
      <div className={styles.text}>
        <h2 id="contact-success-title">We&apos;ve Received Your Request!</h2>
        <p id="contact-success-text">Thank you for trusting SMASH with your business targets. We will reach out within 12 hours.</p>
      </div>
      <Button href={ROUTES.HOME} variant="secondary" className={styles.action}>Back To Home</Button>
    </Modal>
  );
}
