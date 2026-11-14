import { useState, type FormEvent } from "react";
import { Copy, ListChecks, MessageCircle, Plus, RefreshCw, Share2 } from "lucide-react";
import { Button, Dialog, EmptyState } from "../../../ui";
import { MyWeekScreen } from "../MyWeekScreen";
import { usePlan } from "../PlanContext";
import { usePlanCopy } from "../strings";
import { ListRow } from "./ListRow";
import { useShoppingList } from "./listStore";
import { AISLES, buildShoppingList, groupByAisle, listText, whatsAppShareUrl, type Aisle } from "./shoppingList";
import styles from "../Plan.module.css";
import local from "./ShoppingList.module.css";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShoppingChecklist() {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const shopping = useShoppingList();
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [aisle, setAisle] = useState<Aisle>("produce");
  const diet = copy.diet[plan.settings.diet];
  const list = shopping.list;

  function build() {
    shopping.replace(plan.settings.diet, buildShoppingList(plan.settings.diet, plan.meals));
    setStatus(copy.built);
    setConfirm(false);
  }

  if (!list) {
    return (
      <MyWeekScreen>
        <p className={styles.body}>{copy.listIntro(diet)}</p>
        <EmptyState title={copy.makeListTitle} icon={ListChecks} action={<Button variant="primary" onClick={build}>{copy.makeList}</Button>}>
          <p>{copy.makeListBody(plan.meals.length * 4)}</p>
        </EmptyState>
      </MyWeekScreen>
    );
  }

  const text = listText(list.items, { title: copy.listTitle, note: copy.listNote, aisles: copy.aisles });
  const ticked = list.items.filter((item) => item.checked).length;

  async function onCopy() {
    const ok = await copyText(text);
    setFallback(ok ? null : text);
    setStatus(ok ? copy.copied : copy.copyFailed);
  }

  async function onShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: copy.listTitle, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const ok = await copyText(text);
    setFallback(ok ? null : text);
    setStatus(ok ? copy.shareFallback : copy.copyFailed);
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    shopping.add(name.trim(), quantity.trim(), aisle);
    setStatus(copy.addedItem(name.trim()));
    setName("");
    setQuantity("");
  }

  return (
    <MyWeekScreen>
      <p className={local.intro}>{copy.listIntro(copy.diet[list.diet])} {copy.noClaims}</p>
      <div className={local.layout}>
        <div className={local.main}>
          <p className={local.progress}>
            <span className={local.progressNumber}>{ticked}</span>
            <span>{copy.ticked(ticked, list.items.length)}</span>
          </p>
          {list.diet !== plan.settings.diet && <p className={local.notice}>{copy.dietChanged(diet)}</p>}
          {groupByAisle(list.items).map((group) => (
            <section key={group.aisle} className={local.group} aria-labelledby={`aisle-${group.aisle}`}>
              <h2 id={`aisle-${group.aisle}`} className={local.aisle}>{copy.aisles[group.aisle]}</h2>
              <ul className={local.rows} role="list">
                {group.items.map((item) => (
                  <ListRow
                    key={item.id}
                    item={item}
                    onToggle={() => shopping.toggle(item.id)}
                    onEdit={(patch) => shopping.edit(item.id, patch)}
                    onRemove={() => shopping.remove(item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
          <form className={local.addForm} onSubmit={onAdd} aria-labelledby="list-add">
            <h2 id="list-add" className={local.aisle}>{copy.addTitle}</h2>
            <label className={local.editField}>
              <span>{copy.itemName}</span>
              <input className={local.input} value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className={local.editField}>
              <span>{copy.itemQuantity}</span>
              <input className={local.input} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
            <label className={local.editField}>
              <span>{copy.aisle}</span>
              <select className={local.input} value={aisle} onChange={(event) => setAisle(event.target.value as Aisle)}>
                {AISLES.map((value) => <option key={value} value={value}>{copy.aisles[value]}</option>)}
              </select>
            </label>
            <Button type="submit" icon={Plus}>{copy.addItem}</Button>
          </form>
        </div>

        <aside className={local.actions} aria-label={copy.sendTitle}>
          <h2 className={local.aisle}>{copy.sendTitle}</h2>
          <Button variant="primary" wide icon={MessageCircle} href={whatsAppShareUrl(text)} target="_blank" rel="noopener noreferrer">
            {copy.sendWhatsApp}<span className="sr-only"> {copy.newTab}</span>
          </Button>
          <p className={styles.fine}>{copy.whatsAppNote}</p>
          <div className={local.pair}>
            <Button icon={Copy} onClick={onCopy}>{copy.copyList}</Button>
            <Button icon={Share2} onClick={onShare}>{copy.shareList}</Button>
          </div>
          <p className={styles.fine}>{copy.tickedLeftOut}</p>
          <p className={styles.status} role="status">{status}</p>
          {fallback && <textarea className={local.fallback} readOnly value={fallback} aria-label={copy.listTitle} rows={8} />}
          <Button variant="quiet" icon={RefreshCw} onClick={() => setConfirm(true)}>{copy.rebuild}</Button>
        </aside>
      </div>
      <Dialog
        title={copy.rebuildTitle}
        description={copy.rebuildBody}
        open={confirm}
        onOpenChange={setConfirm}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>{copy.cancel}</Button>
            <Button variant="primary" onClick={build}>{copy.rebuildConfirm}</Button>
          </>
        )}
      >
        <span />
      </Dialog>
    </MyWeekScreen>
  );
}
