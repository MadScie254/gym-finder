import { Link } from "react-router";
import { useVenueContext } from "../../app/venue-context";
import { t } from "../../lib/i18n";

export function MorePage() {
  const { lang, setLang } = useVenueContext();
  return (
    <section className="page">
      <h1>{t(lang, "more")}</h1>
      <p>
        <button type="button" className="btn" onClick={() => setLang(lang === "en" ? "sw" : "en")}>
          {lang === "en" ? "Kiswahili" : "English"}
        </button>
      </p>
      <ul className="more-list">
        <li><Link to="/about/data">{t(lang, "about")}</Link></li>
        <li><Link to="/legal">{t(lang, "legal")}</Link></li>
        <li><Link to="/commute">{t(lang, "commute")}</Link></li>
        <li><Link to="/compare">{t(lang, "compare")}</Link></li>
      </ul>
      <p className="muted">Install from the browser menu. After one online visit, search and saved gyms stay available offline. Map tiles are best-effort.</p>
    </section>
  );
}
