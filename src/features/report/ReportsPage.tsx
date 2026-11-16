import { useEffect, useState } from "react";
import { Flag, MessageCircle, Trash2 } from "lucide-react";
import { Page } from "../../app/Page";
import { useT, useVenueContext } from "../../app/venue-context";
import { backend, type Submission } from "../../lib/backend";
import { formatDate } from "../../lib/i18n";
import { reportMessage, supportWhatsAppHref } from "../../lib/report";
import { Button, EmptyState, IconButton } from "../../ui";
import { useReport } from "./report-store";
import styles from "./Report.module.css";

/** Under the menu: every report made on this device, with its honest status. */
export function ReportsPage() {
  const tr = useT();
  const { index, lang } = useVenueContext();
  const report = useReport();
  const [rows, setRows] = useState<Submission[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => backend.list().then((next) => { if (active) setRows(next); });
    void load();
    window.addEventListener("fmg-submission", load);
    return () => { active = false; window.removeEventListener("fmg-submission", load); };
  }, []);

  async function remove(id: string) {
    await backend.remove(id);
    setRows(await backend.list());
  }

  return (
    <Page title={tr("reportsTitle")} intro={tr("reportsIntro")}
      actions={<Button variant="secondary" icon={Flag} onClick={() => report.open("add_gym", null)}>{tr("menuAddGym")}</Button>}>
      {rows && rows.length === 0 && <EmptyState icon={Flag} level={2} title={tr("reportsEmptyTitle")}>{tr("reportsEmptyBody")}</EmptyState>}
      {rows && rows.length > 0 && (
        <ul role="list" className={styles.reports}>
          {rows.map((row) => {
            const venue = row.venueId ? index?.byId.get(row.venueId) ?? null : null;
            const href = supportWhatsAppHref(reportMessage(row, venue));
            return (
              <li key={row.id} className={styles.report}>
                <div className={styles.reportHead}>
                  <h2 className={styles.reportTitle}>{row.venueName}</h2>
                  <IconButton icon={Trash2} variant="quiet" label={tr("reportsDelete", { name: row.venueName })} onClick={() => { void remove(row.id); }} />
                </div>
                <p className={styles.reportKind}>{tr(`issue_${row.kind}` as const)}. {tr("reportsSent", { date: formatDate(lang, row.createdAt) })}</p>
                {row.message && <p>{row.message}</p>}
                <p className={styles.statusLine}>{tr("reportStatusLocal")}</p>
                {href && <Button variant="secondary" icon={MessageCircle} href={href} target="_blank" rel="noopener noreferrer">{tr("reportSendWhatsApp")}</Button>}
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
