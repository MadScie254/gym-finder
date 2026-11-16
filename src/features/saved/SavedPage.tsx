import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Bookmark, Download, Share2, Upload } from "lucide-react";
import { Page } from "../../app/Page";
import { useCompare, useSaved } from "../../app/stores";
import { useT, useVenueContext } from "../../app/venue-context";
import { plural } from "../../lib/i18n";
import { currentVenue, exportSaved, parseIdList, parseImport, sharedListPath, type SavedEntry } from "../../lib/saved";
import { absoluteUrl, shareLink } from "../../lib/share";
import { Banner, Button, buttonClassName, EmptyState } from "../../ui";
import { loadMyGymId, saveMyGymId } from "../plan/planStore";
import { SavedItem } from "./SavedItem";
import styles from "./Saved.module.css";

/** Saved gyms on this device: notes, order, Undo, compare, "my gym", export, import and a share link (G6). */
export function SavedPage() {
  const tr = useT();
  const { index } = useVenueContext();
  const saved = useSaved();
  const compare = useCompare();
  const [params, setParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [undo, setUndo] = useState<{ entry: SavedEntry; at: number } | null>(null);
  const [myGym, setMyGym] = useState<string | null>(() => loadMyGymId());
  const sharedIds = parseIdList(params.get("list"));
  const shared = useMemo(() => sharedIds.map((id) => index?.byId.get(id)).filter((venue) => venue != null), [sharedIds.join(","), index]);

  function remove(entry: SavedEntry, at: number) {
    saved.toggle(entry.snapshot);
    setUndo({ entry, at });
    setStatus(tr("savedRemoved", { name: entry.snapshot.name }));
  }

  function download() {
    const blob = new Blob([exportSaved(saved.entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `find-my-gym-saved-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const added = saved.add(parseImport(await file.text()));
      setStatus(added === 0 ? tr("importNone") : plural(tr, added, "importDoneOne", "importDoneMany"));
    } catch {
      setStatus(tr("importBad"));
    }
  }

  async function share() {
    const outcome = await shareLink({ title: tr("savedTitle"), url: absoluteUrl(sharedListPath(saved.entries)) });
    setStatus(outcome === "copied" ? tr("shareCopied") : outcome === "failed" ? tr("shareFailed") : "");
  }

  function saveShared() {
    const now = new Date().toISOString();
    const added = saved.add(shared.map((venue) => ({ id: venue.id, savedAt: now, note: "", snapshot: venue })));
    setStatus(added === 0 ? tr("importNone") : tr("sharedDone"));
    setParams({});
  }

  if (shared.length > 0) {
    return (
      <Page title={tr("sharedTitle")} intro={tr("sharedBody")}
        actions={<><Button variant="primary" icon={Bookmark} onClick={saveShared}>{tr("sharedSaveAll")}</Button><Link to="/saved" className={buttonClassName("secondary")}>{tr("sharedMine")}</Link></>}>
        <ul role="list" className={styles.list}>
          {shared.map((venue) => (
            <li key={venue.id} className={styles.item}><h2 className={styles.name}><Link to={`/gym/${venue.slug}`}>{venue.name}</Link></h2></li>
          ))}
        </ul>
      </Page>
    );
  }

  return (
    <Page title={tr("savedTitle")} intro={tr("savedIntro")}
      actions={(
        <>
          {saved.entries.length > 0 && <Button variant="secondary" icon={Share2} onClick={() => { void share(); }}>{tr("savedShare")}</Button>}
          {saved.entries.length > 0 && <Button variant="secondary" icon={Download} onClick={download}>{tr("savedExport")}</Button>}
          <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>{tr("savedImport")}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { void upload(event); }} />
        </>
      )}>
      <p className={styles.device}>{tr("savedOnDevice")}</p>
      <div role="status" className={styles.status}>
        {status && (undo ? (
          <Banner kind="update" action={{ label: tr("undo"), onClick: () => { saved.restore(undo.entry, undo.at); setUndo(null); setStatus(""); } }}>{status}</Banner>
        ) : <p>{status}</p>)}
      </div>
      {saved.entries.length === 0 ? (
        <EmptyState photo="functional-floor" level={2} title={tr("savedEmptyTitle")} action={<Link to="/search" className={buttonClassName("primary")}>{tr("homeFind")}</Link>}>
          {tr("savedEmptyBody")}
        </EmptyState>
      ) : (
        <>
          {compare.ids.length > 0 && <p><Link to={`/compare?ids=${encodeURIComponent(compare.ids.join(","))}`} className={buttonClassName("primary")}>{plural(tr, compare.ids.length, "trayCountOne", "trayCountMany")}</Link></p>}
          <ul role="list" className={styles.list}>
            {saved.entries.map((entry, at) => {
              const { venue, gone } = currentVenue(entry, index?.byId ?? null);
              return (
                <SavedItem key={entry.id} entry={entry} venue={venue} gone={gone} first={at === 0} last={at === saved.entries.length - 1}
                  compared={compare.has(entry.id)} compareFull={compare.ids.length >= 3} myGym={myGym === entry.id}
                  onMove={(delta) => saved.move(entry.id, delta)} onNote={(text) => saved.note(entry.id, text)}
                  onRemove={() => remove(entry, at)}
                  onCompare={() => { if (!compare.toggle(entry.id)) setStatus(tr("compareFull")); }}
                  onMyGym={() => { const next = myGym === entry.id ? null : entry.id; saveMyGymId(next); setMyGym(next); }} />
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
