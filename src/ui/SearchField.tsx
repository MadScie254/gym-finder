import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { LocateFixed, Search, X } from "lucide-react";
import { IconButton } from "./IconButton";
import styles from "./SearchField.module.css";

export type SearchOption = { id: string; label: string; hint?: string };
export type SearchGroup = { id: string; label: string; options: SearchOption[] };

export type SearchFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  groups: SearchGroup[];
  onSelect: (option: SearchOption, group: SearchGroup) => void;
  placeholder?: string;
  /** Characters needed before options or the empty message show. */
  minChars?: number;
  /** Shown when the query is long enough and nothing matches. */
  emptyText?: string;
  onLocate?: () => void;
  locateLabel?: string;
  /** Start with the list open, for previews and tests. */
  defaultOpen?: boolean;
};

/** ARIA 1.2 combobox: input with a grouped listbox popup and aria-activedescendant focus. */
export function SearchField({
  label, value, onValueChange, groups, onSelect, placeholder, minChars = 2,
  emptyText = "No gyms or places match that.", onLocate, locateLabel = "Use my location", defaultOpen = false,
}: SearchFieldProps) {
  const base = useId();
  const listId = `${base}-list`;
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(0);
  const flat = useMemo(() => groups.flatMap((group) => group.options.map((option) => ({ option, group }))), [groups]);
  const ready = value.trim().length >= minChars;
  const expanded = open && ready && flat.length > 0;
  const optionId = (groupId: string, id: string) => `${base}-opt-${groupId}-${id}`;
  const current = expanded ? flat[Math.min(active, flat.length - 1)] : undefined;

  function choose(index: number) {
    const row = flat[index];
    if (!row) return;
    setOpen(false);
    onSelect(row.option, row.group);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!expanded) { setOpen(true); setActive(event.key === "ArrowDown" ? 0 : flat.length - 1); return; }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive((n) => (n + delta + flat.length) % flat.length);
    } else if (event.key === "Enter" && expanded) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      if (expanded) setOpen(false);
      else onValueChange("");
    }
  }

  return (
    <div className={styles.field}>
      <label className="sr-only" htmlFor={`${base}-input`}>{label}</label>
      <div className={styles.control}>
        <Search className={styles.lead} aria-hidden="true" size={20} strokeWidth={2.25} />
        <input
          id={`${base}-input`}
          className={styles.input}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? optionId(current.group.id, current.option.id) : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(event) => { onValueChange(event.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {value && <IconButton icon={X} label="Clear search" variant="quiet" onClick={() => onValueChange("")} />}
        {onLocate && <IconButton icon={LocateFixed} label={locateLabel} variant="quiet" onClick={onLocate} />}
      </div>
      <div id={listId} role="listbox" aria-label={label} className={styles.popup} hidden={!expanded}>
        {groups.filter((group) => group.options.length > 0).map((group) => (
          <div key={group.id} role="group" aria-labelledby={`${base}-g-${group.id}`} className={styles.group}>
            <div role="presentation" id={`${base}-g-${group.id}`} className={styles.groupLabel}>{group.label}</div>
            {group.options.map((option) => {
              const index = flat.findIndex((row) => row.option.id === option.id && row.group.id === group.id);
              const selected = current?.option.id === option.id && current.group.id === group.id;
              return (
                <div
                  key={option.id}
                  id={optionId(group.id, option.id)}
                  role="option"
                  aria-selected={selected}
                  className={styles.option}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.hint && <span className={styles.optionHint}>{option.hint}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className={ready && open && flat.length === 0 ? styles.empty : "sr-only"} role="status">
        {ready && open ? (flat.length === 0 ? emptyText : `${flat.length} suggestions`) : ""}
      </p>
    </div>
  );
}
