import styles from "@/components/client/Dashboard.module.css";

export default function Loading() {
  return (
    <div className={styles.wrap} style={{ paddingTop: 48 }} aria-busy="true" aria-label="Loading your dashboard">
      <div style={{ height: 36, width: 280, borderRadius: 10, background: "var(--client-border)", opacity: 0.7 }} />
      <div className={styles.stats} style={{ marginTop: 28 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className={styles.tile} style={{ height: 150, opacity: 0.6 }} />)}
      </div>
    </div>
  );
}
