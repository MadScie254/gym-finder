import { useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button, IconButton } from "../../ui";
import type { ListItem } from "./shoppingList";
import { useFuelCopy } from "./strings";
import local from "./ShoppingList.module.css";

type Props = {
  item: ListItem;
  onToggle: () => void;
  onEdit: (patch: Pick<ListItem, "name" | "quantity">) => void;
  onRemove: () => void;
};

export function ListRow({ item, onToggle, onEdit, onRemove }: Props) {
  const copy = useFuelCopy();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const id = `list-${item.id}`;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onEdit({ name: name.trim(), quantity: quantity.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className={local.row}>
        <form className={local.editForm} onSubmit={submit} aria-label={copy.editLabel(item.name)}>
          <label className={local.editField}>
            <span>{copy.itemName}</span>
            <input className={local.input} value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className={local.editField}>
            <span>{copy.itemQuantity}</span>
            <input className={local.input} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <div className={local.editActions}>
            <Button type="submit" variant="primary">{copy.saveItem}</Button>
            <Button variant="secondary" onClick={() => { setName(item.name); setQuantity(item.quantity); setEditing(false); }}>{copy.cancel}</Button>
            <Button variant="quiet" icon={Trash2} onClick={onRemove}>{copy.removeItem}</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={local.row} data-checked={item.checked || undefined}>
      <input id={id} type="checkbox" className={local.check} checked={item.checked} onChange={onToggle} />
      <label htmlFor={id} className={local.rowLabel}>
        <span className={local.name}>{item.name}</span>
        <span className={local.quantity}>{item.quantity}</span>
      </label>
      <IconButton icon={Pencil} label={copy.editLabel(item.name)} variant="quiet" onClick={() => setEditing(true)} />
    </li>
  );
}
