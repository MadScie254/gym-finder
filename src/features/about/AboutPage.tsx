import { Page, pageStyles } from "../../app/Page";
import { useT, useVenueContext } from "../../app/venue-context";
import type { TrustTier } from "../../data/types";
import { formatDate } from "../../lib/i18n";
import { isParsedHours } from "../../lib/hours";
import { PHOTOS, PHOTO_IDS } from "../../assets/photos";
import { TrustBadge } from "../../ui";

const TIERS: TrustTier[] = ["verified", "corroborated", "listed", "unconfirmed"];

/** Where the list comes from, what each evidence label means, and how thin the details still are. */
export function AboutPage() {
  const tr = useT();
  const { index, lang } = useVenueContext();
  const manifest = index?.manifest;
  const visible = index?.venues.filter((venue) => venue.trust.tier !== "unconfirmed") ?? [];
  const emptyCounties = manifest ? Object.entries(manifest.counts.byCounty).filter(([, n]) => n === 0).map(([name]) => name) : [];
  const coverage = [
    { label: tr("aboutWithContact"), n: visible.filter((venue) => venue.phones.length || venue.whatsapp || venue.website).length },
    { label: tr("aboutWithHours"), n: visible.filter((venue) => venue.hours?.text || isParsedHours(venue.hours?.raw)).length },
    { label: tr("aboutWithPrice"), n: visible.filter((venue) => venue.prices).length },
    { label: tr("aboutWithAmenities"), n: visible.filter((venue) => Object.keys(venue.amenities).length > 0).length },
  ];

  return (
    <Page title={tr("menuAbout")} intro={tr("aboutIntro")}>
      <div className={pageStyles.prose}>
        {!manifest ? <p>{tr("loadingGyms")}</p> : (
          <>
            <p>{tr("aboutBuilt", { date: formatDate(lang, manifest.builtAt), shown: manifest.counts.defaultVisible, total: manifest.counts.total })}</p>
            <h2>{tr("aboutLabels")}</h2>
            <table className={pageStyles.table}>
              <tbody>
                {TIERS.map((tier) => (
                  <tr key={tier}>
                    <th scope="row"><TrustBadge tier={tier} word={tr(`trust_${tier}`)} /></th>
                    <td>{tr(`tierExplain_${tier}`)}</td>
                    <td>{manifest.counts.byTier[tier]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={pageStyles.muted}>{tr("aboutUnconfirmedHidden")}</p>
            <h2>{tr("aboutCoverage")}</h2>
            <table className={pageStyles.table}>
              <tbody>
                {coverage.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{tr("aboutOf", { n: row.n, total: visible.length })}</td></tr>)}
              </tbody>
            </table>
            <p>{tr("aboutEmptyCounties", { n: emptyCounties.length, names: emptyCounties.join(", ") })}</p>
            <h2>{tr("aboutNever")}</h2>
            <p>{tr("aboutNeverBody")}</p>
            <h2>{tr("aboutLicences")}</h2>
            <ul>{manifest.licenses.map((item) => <li key={item}>{item}</li>)}</ul>
            {manifest.notices.map((item) => <p key={item} className={pageStyles.muted}>{item}</p>)}
          </>
        )}
        <h2>{tr("aboutPictures")}</h2>
        <p>{tr("aboutPicturesBody")}</p>
        <ul>
          {PHOTO_IDS.map((id) => {
            const { credit } = PHOTOS[id];
            return (
              <li key={id}>
                <a href={credit.page} target="_blank" rel="noopener noreferrer">
                  {tr("aboutPictureCredit", { title: credit.title, author: credit.author })}
                  <span className="sr-only"> {tr("aboutOpensNewTab")}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <p className={pageStyles.muted}>
          <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">{PHOTOS[PHOTO_IDS[0]].credit.licence}<span className="sr-only"> {tr("aboutOpensNewTab")}</span></a>
        </p>
      </div>
    </Page>
  );
}
