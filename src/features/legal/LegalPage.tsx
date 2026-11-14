import { Page, pageStyles } from "../../app/Page";
import { useT } from "../../app/venue-context";
import type { CopyKey } from "../../lib/i18n";

const PARAGRAPHS: CopyKey[] = ["legalLocation", "legalStorage", "legalReports", "legalData", "legalTiles"];

/** Data and privacy, in plain words. */
export function LegalPage() {
  const tr = useT();
  return (
    <Page title={tr("menuLegal")}>
      <div className={pageStyles.prose}>
        {PARAGRAPHS.map((key) => <p key={key}>{tr(key)}</p>)}
      </div>
    </Page>
  );
}
