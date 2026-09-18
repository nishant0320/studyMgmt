import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search, Tags } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { availableCategories, categoryKey } from '../utils/categories';
import { useDropdownPosition } from '../hooks/useDropdownPosition';

type Props = { value: string; onChange: (category: string) => void; label?: string; disabled?: boolean };

export function CategorySelect({ value, onChange, label = 'Category', disabled = false }: Props) {
  const { state, dispatch } = useAppStore();
  const categories = useMemo(() => availableCategories(state, value), [state.customCategories, state.tasks, state.events, state.sessions, value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const listId = useId();
  const filtered = categories.filter(category => categoryKey(category).includes(categoryKey(query)));
  const newName = query.trim();
  const canCreate = !!newName && !categories.some(category => categoryKey(category) === categoryKey(newName));
  const count = filtered.length + (canCreate ? 1 : 0);
  const activeIndex = Math.min(active, Math.max(0, count - 1));
  const position = useDropdownPosition(open, trigger, popup, count, 250, () => setOpen(false));
  const close = (restore = false) => { setOpen(false); setQuery(''); if (restore) trigger.current?.focus({ preventScroll: true }); };
  const openMenu = () => { if (!disabled) { setQuery(''); setActive(Math.max(0, categories.indexOf(value))); setOpen(true); } };
  const choose = (index: number) => {
    if (disabled) return;
    const category = filtered[index] ?? (canCreate && index === filtered.length ? newName : undefined);
    if (!category) return;
    if (index === filtered.length && canCreate) dispatch({ type: 'update-categories', categories: [...(state.customCategories ?? []), category] });
    onChange(category); close(true);
  };
  // The search is portaled; Tab resumes next to the trigger inside its original form.
  const tabOut = (backward: boolean) => {
    const dialog = trigger.current?.closest('[role="dialog"]');
    const scope = dialog ?? document;
    const elements = Array.from(scope.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 && !popup.current?.contains(element));
    const index = elements.indexOf(trigger.current!);
    const next = index + (backward ? -1 : 1);
    close();
    (elements[dialog ? (next + elements.length) % elements.length : next] ?? trigger.current)?.focus();
  };
  useEffect(() => { if (open) search.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('pointerdown', outside); };
  }, [open]);
  useEffect(() => { if (open) popup.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' }); }, [activeIndex, open]);

  return <div className="category-select">
    <button ref={trigger} type="button" className="select-trigger category-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} disabled={disabled}
      onClick={() => open ? close(true) : openMenu()} onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); openMenu(); }
        else if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); openMenu(); setQuery(event.key); setActive(0); }
      }}><span className="category-trigger-value"><Tags size={15}/><span>{value || 'Choose a category'}</span></span><ChevronDown size={15}/></button>
    {open && createPortal(<div ref={popup} className="select-options category-popover" style={position} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      else if (event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); tabOut(event.shiftKey); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + Math.max(1,count)) % Math.max(1,count)); }
      else if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); choose(activeIndex); }
    }}>
      <div className="category-menu-search"><Search size={16}/><input ref={search} type="text" role="combobox" aria-label="Search categories" aria-autocomplete="list" aria-expanded={true} aria-controls={listId} aria-activedescendant={count ? `${listId}-${activeIndex}` : undefined} autoComplete="off" spellCheck={false} maxLength={100} value={query} placeholder="Search or create a category…" onChange={event => { setQuery(event.target.value); setActive(0); }}/></div>
      <div id={listId} role="listbox" aria-label={`${label} options`} className="category-options" onMouseDown={event => event.preventDefault()}>
        {filtered.map((category, index) => <div id={`${listId}-${index}`} key={category} data-index={index} role="option" aria-selected={categoryKey(category) === categoryKey(value)} className={`select-option ${index === activeIndex ? 'highlighted' : ''} ${categoryKey(category) === categoryKey(value) ? 'chosen' : ''}`} onMouseEnter={() => setActive(index)} onClick={event => { event.stopPropagation(); choose(index); }}><span>{category}</span>{categoryKey(category) === categoryKey(value) && <Check size={15}/>}</div>)}
        {canCreate && <div id={`${listId}-${filtered.length}`} data-index={filtered.length} role="option" aria-selected={false} className={`select-option category-create ${activeIndex === filtered.length ? 'highlighted' : ''}`} onMouseEnter={() => setActive(filtered.length)} onClick={event => { event.stopPropagation(); choose(filtered.length); }}><Plus size={15}/><span>Create “{newName}”</span></div>}
      </div>
      <div className="category-menu-footer">{canCreate ? 'New categories are saved across your workspace.' : `${filtered.length} ${filtered.length === 1 ? 'category' : 'categories'} · Manage in Settings`}</div>
    </div>, document.body)}
  </div>;
}
