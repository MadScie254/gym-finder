import { useId, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { useT } from "../../app/venue-context";
import type { Venue } from "../../data/types";
import { backend, ISSUE_KINDS, type IssueKind, type Submission } from "../../lib/backend";
import type { CopyKey } from "../../lib/i18n";
import { reportMessage, supportWhatsAppHref } from "../../lib/report";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import styles from "./Report.module.css";

const TITLE: Partial<Record<IssueKind, CopyKey>> = { add_gym: "reportTitleAdd", claim: "reportTitleClaim" };
const NEEDS_MESSAGE = new Set<IssueKind>(["wrong_details", "claim", "other"]);

export type ReportDialogProps = { initialKind: IssueKind; venue: Venue | null; onClose: () => void };

/** Report, add or claim in one form. Saved through `backend` first, then offered to WhatsApp. */
export default function ReportDialog({ initialKind, venue, onClose }: ReportDialogProps) {
  const tr = useT();
  const id = useId();
  const [kind, setKind] = useState<IssueKind>(initialKind);
  const [name, setName] = useState(venue?.name ?? "");
  const [place, setPlace] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<CopyKey | null>(null);
  const [saved, setSaved] = useState<Submission | null>(null);
  const kinds = venue ? ISSUE_KINDS.filter((item) => item !== "add_gym") : (["add_gym", "other"] as IssueKind[]);
  const adding = kind === "add_gym";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError("reportNeedName"); return; }
    if (NEEDS_MESSAGE.has(kind) && !message.trim()) { setError("reportNeedMessage"); return; }
    setError(null);
    setSaved(await backend.submit({
      kind, venueId: adding ? null : venue?.id ?? null, venueName: name, message,
      ...(adding && place.trim() ? { place: place.trim() } : {}),
      ...(contact.trim() ? { contact: contact.trim().slice(0, 120) } : {}),
    }));
  }

  if (saved) {
    const href = supportWhatsAppHref(reportMessage(saved, adding ? null : venue));
    return (
      <Dialog title={tr("reportSavedTitle")} open onOpenChange={(open) => { if (!open) onClose(); }}
        footer={href ? (
          <>
            <Button variant="secondary" onClick={onClose}>{tr("reportDone")}</Button>
            <Button variant="primary" icon={MessageCircle} href={href} target="_blank" rel="noopener noreferrer">{tr("reportSendWhatsApp")}</Button>
          </>
        ) : <Button variant="primary" onClick={onClose}>{tr("reportDone")}</Button>}>
        <div className={styles.done} data-testid="report-saved">
          <p className={styles.status}>{tr("reportStatusLocal")}</p>
          <p className={styles.hint}>{href ? tr("reportSendHint") : tr("reportNoWhatsApp")}</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={tr(TITLE[kind] ?? "reportTitle")}
      description={tr("reportIntro")}
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>{tr("reportCancel")}</Button>
          <Button variant="primary" type="submit" form={`${id}-form`}>{tr("reportSubmit")}</Button>
        </>
      )}
    >
      <form id={`${id}-form`} className={styles.form} onSubmit={submit} noValidate>
        <fieldset className={styles.kinds}>
          <legend className={styles.label}>{tr("reportIssue")}</legend>
          {kinds.map((item) => (
            <label key={item} className={styles.kind}>
              <input type="radio" name={`${id}-kind`} value={item} checked={kind === item} onChange={() => setKind(item)} />
              <span>{tr(`issue_${item}`)}</span>
            </label>
          ))}
        </fieldset>
        <label className={styles.field}>
          <span className={styles.label}>{tr("reportGymName")}</span>
          <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} readOnly={Boolean(venue) && !adding} maxLength={160} aria-invalid={error === "reportNeedName" || undefined} />
        </label>
        {adding && (
          <label className={styles.field}>
            <span className={styles.label}>{tr("reportPlace")}</span>
            <input className={styles.input} value={place} onChange={(event) => setPlace(event.target.value)} maxLength={120} />
          </label>
        )}
        <label className={styles.field}>
          <span className={styles.label}>{tr(kind === "claim" ? "reportMessageClaim" : "reportMessage")}</span>
          <textarea className={styles.input} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} aria-invalid={error === "reportNeedMessage" || undefined} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tr("reportContact")}</span>
          <input className={styles.input} value={contact} onChange={(event) => setContact(event.target.value)} maxLength={120} autoComplete="tel" />
        </label>
        <p className={styles.error} role="alert">{error ? tr(error) : ""}</p>
      </form>
    </Dialog>
  );
}
