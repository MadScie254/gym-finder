import { useEffect, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import type { Venue } from "../../data/types";
import { safeWhatsAppUrl } from "../../lib/format";
import { t, type CopyKey, type Lang } from "../../lib/i18n";
import { loadVisits, toggleVisit, type VisitMarks } from "../../lib/visits";
import { Button } from "../../ui";
import styles from "./Detail.module.css";

const QUESTIONS: CopyKey[] = ["askFees", "askHours", "askTrial", "askBring"];

/** Questions to settle before a first visit, a message to send them, and the visitor's own marks. The app never books. */
export function FirstVisit({ venue, lang }: { venue: Venue; lang: Lang }) {
  const [marks, setMarks] = useState<VisitMarks>({});
  const [status, setStatus] = useState("");
  useEffect(() => { setMarks(loadVisits()[venue.id] ?? {}); }, [venue.id]);
  const message = t(lang, "firstVisitMessage", { name: venue.name, questions: QUESTIONS.map((key) => `- ${t(lang, key)}`).join("\n") });
  const wa = safeWhatsAppUrl(venue.whatsapp, message);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus(t(lang, "messageCopied"));
    } catch {
      setStatus(t(lang, "messageCopyFailed"));
    }
  }

  return (
    <section className={styles.section} aria-labelledby="detail-first">
      <h2 id="detail-first">{t(lang, "firstVisitHeading")}</h2>
      <ul className={styles.questions}>{QUESTIONS.map((key) => <li key={key}>{t(lang, key)}</li>)}</ul>
      <div className={styles.keep}>
        <Button variant="secondary" icon={Copy} onClick={() => { void copy(); }}>{t(lang, "copyMessage")}</Button>
        {wa && <Button variant="secondary" icon={MessageCircle} href={wa} target="_blank" rel="noopener noreferrer">{t(lang, "sendOnWhatsApp")}</Button>}
      </div>
      <p role="status" className={styles.note}>{status}</p>
      <div className={styles.marks} role="group" aria-label={t(lang, "yourNotes")}>
        {(["contacted", "visited"] as const).map((mark) => (
          <Button key={mark} variant="quiet" aria-pressed={Boolean(marks[mark])} onClick={() => setMarks(toggleVisit(venue.id, mark))}>
            {t(lang, mark === "contacted" ? "markContacted" : "markVisited")}
          </Button>
        ))}
      </div>
      <p className={styles.note}>{t(lang, "marksNote")}</p>
    </section>
  );
}
