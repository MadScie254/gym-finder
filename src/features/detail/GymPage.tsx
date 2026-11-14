import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { SearchX } from "lucide-react";
import { useExplore } from "../../app/explore-context";
import { useT, useVenueContext } from "../../app/venue-context";
import { EmptyState, SkeletonList } from "../../ui";
import { placeOf } from "../results/ResultCard";
import { Detail } from "./Detail";

/** `/gym/:slug`: a standalone page, so shared links work without the search screen behind them. */
export function GymPage() {
  const tr = useT();
  const { slug = "" } = useParams();
  const { index, origin, lang } = useVenueContext();
  const { setSelectedId } = useExplore();
  const venue = index?.bySlug.get(slug) ?? null;

  useEffect(() => { if (venue) setSelectedId(venue.id); }, [venue, setSelectedId]);
  useEffect(() => {
    if (venue) document.title = `${venue.name}, ${placeOf(venue, lang)}. ${tr("brand")}`;
  }, [venue, lang, tr]);
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!index) return <SkeletonList count={1} label={tr("loadingGyms")} />;
  if (!venue) {
    return (
      <EmptyState icon={SearchX} title={tr("detailNotFoundTitle")} action={<Link to="/search">{tr("goHome")}</Link>}>
        {tr("detailNotFoundBody")}
      </EmptyState>
    );
  }
  return <Detail venue={venue} lang={lang} origin={origin} />;
}
