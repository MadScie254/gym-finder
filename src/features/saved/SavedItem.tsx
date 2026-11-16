import { Link } from "react-router";
import { ChevronDown, ChevronUp, Columns3, Home, Trash2 } from "lucide-react";
import { useT, useVenueContext } from "../../app/venue-context";
import type { Venue } from "../../data/types";
import { formatDate } from "../../lib/i18n";
import type { SavedEntry } from "../../lib/saved";
import { Button, IconButton, TrustBadge } from "../../ui";
import { cardFact, kindLabel, placeOf } from "../results/ResultCard";
import styles from "./Saved.module.css";

export type SavedItemProps = {
  entry: SavedEntry;
  venue: Venue;
  gone: boolean;
  first: boolean;
  last: boolean;
  compared: boolean;
  compareFull: boolean;
  myGym: boolean;
  onMove: (delta: -1 | 1) => void;
  onNote: (text: string) => void;
  onRemove: () => void;
  onCompare: () => void;
  onMyGym: () => void;
};

/** One saved gym: compact facts, a private note, and the shortlist controls. */
export function SavedItem({ entry, venue, gone, first, last, compared, compareFull, myGym, onMove, onNote, onRemove, onCompare, onMyGym }: SavedItemProps) {
  const tr = useT();
  const { lang } = useVenueContext();
  const noteId = `note-${entry.id.replace(/\W/g, "-")}`;
  return (
    <li className={styles.item} data-my-gym={myGym || undefined}>
      <div className={styles.top}>
        <div className={styles.names}>
          <h2 className={styles.name}>
            {gone ? venue.name : <Link to={`/gym/${venue.slug}`}>{venue.name}</Link>}
          </h2>
          <p className={styles.meta}>{placeOf(venue, lang)}, {kindLabel(venue.kind, lang)}. {cardFact(venue, lang)}</p>
          <TrustBadge tier={venue.trust.tier} word={tr(`trust_${venue.trust.tier}`)} />
          {myGym && <p className={styles.myGym}>{tr("savedIsMyGym")}</p>}
          {gone && <p className={styles.gone}>{tr("savedGone", { date: formatDate(lang, entry.savedAt) })}</p>}
        </div>
        <div className={styles.order}>
          <IconButton icon={ChevronUp} variant="quiet" label={tr("moveUp", { name: venue.name })} disabled={first} onClick={() => onMove(-1)} />
          <IconButton icon={ChevronDown} variant="quiet" label={tr("moveDown", { name: venue.name })} disabled={last} onClick={() => onMove(1)} />
        </div>
      </div>
      <label className={styles.noteLabel} htmlFor={noteId}>{tr("savedNoteLabel", { name: venue.name })}</label>
      <textarea id={noteId} className={styles.note} rows={2} defaultValue={entry.note} maxLength={500}
        placeholder={tr("savedNotePlaceholder")} onChange={(event) => onNote(event.target.value)} />
      <div className={styles.controls}>
        <Button variant="secondary" icon={Columns3} aria-pressed={compared} disabled={compareFull && !compared} onClick={onCompare}>
          {compared ? tr("actionCompared") : tr("actionCompare")}
        </Button>
        {!gone && (
          <Button variant="quiet" icon={Home} aria-pressed={myGym} onClick={onMyGym}>{myGym ? tr("savedMyGymOn") : tr("savedMakeMyGym")}</Button>
        )}
        <Button variant="quiet" icon={Trash2} onClick={onRemove} aria-label={tr("removeSaved", { name: venue.name })}>{tr("savedRemove")}</Button>
      </div>
    </li>
  );
}
