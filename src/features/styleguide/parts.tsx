import type { ReactNode } from "react";
import styles from "./Styleguide.module.css";

export function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 className={styles.sectionTitle} id={id}>{title}</h2>
      {note && <p className={styles.sectionNote}>{note}</p>}
      <div className={styles.grid}>{children}</div>
    </section>
  );
}

export function Specimen({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <div className={styles.specimen}>
      <h3 className={styles.specimenTitle}>{title}</h3>
      {caption && <p className={styles.caption}>{caption}</p>}
      {children}
    </div>
  );
}

export { styles as sg };
