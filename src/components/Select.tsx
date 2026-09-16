import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size' | 'onChange'> & {
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};
type Option = { value: string; label: ReactNode; text: string; disabled: boolean };
const textContent = (node: ReactNode): string => Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child)).join('');

/** A single-select combobox with anchored, keyboard-accessible options. */
export function Select({ value, defaultValue, onChange, children, disabled, className = '', id, ...props }: Props) {
  const generatedId = useId();
  const listId = `${generatedId}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState(String(defaultValue ?? ''));
  const selected = String(value ?? internal);
  const options: Option[] = Children.toArray(children).flatMap(child => isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child) ? [{ value: String(child.props.value ?? textContent(child.props.children)), label: child.props.children, text: textContent(child.props.children), disabled: !!child.props.disabled }] : []);
  const selectedIndex = options.findIndex(option => option.value === selected);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, selectedIndex));
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 260 });
  const typeahead = useRef({ text: '', at: 0 });
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    setInternal(option.value);
    onChange?.({ target: { value: option.value }, currentTarget: { value: option.value } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    trigger.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 170), window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const upward = below < 180 && above > below;
    const height = Math.min(280, Math.max(96, upward ? above : below), options.length * 38 + 10);
    setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: upward ? rect.top - height - 6 : rect.bottom + 6, width, maxHeight: height });
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !list.current?.contains(event.target as Node)) setOpen(false); };
    const reposition = (event: Event) => { if (!list.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  const move = (direction: number) => {
    let next = active;
    for (let i = 0; i < options.length; i++) { next = (next + direction + options.length) % options.length; if (!options[next].disabled) break; }
    setActive(next);
  };
  return <>
    <button type="button" ref={trigger} id={id || generatedId} role="combobox" className={`select-trigger ${className}`} disabled={disabled}
      aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox" aria-activedescendant={open ? `${listId}-${active}` : undefined}
      onClick={() => { setActive(Math.max(0, selectedIndex)); setOpen(previous => !previous); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          if (!open) { setOpen(true); setActive(Math.max(0, selectedIndex)); return; }
          if (event.key === 'ArrowDown') move(1);
          else if (event.key === 'ArrowUp') move(-1);
          else if (event.key === 'Home') setActive(options.findIndex(option => !option.disabled));
          else if (event.key === 'End') setActive(options.length - 1);
          else choose(active);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          const text = Date.now() - typeahead.current.at < 700 ? typeahead.current.text + event.key.toLowerCase() : event.key.toLowerCase();
          typeahead.current = { text, at: Date.now() };
          const index = options.findIndex(option => !option.disabled && option.text.toLowerCase().startsWith(text));
          if (index >= 0) { setOpen(true); setActive(index); }
        }
      }}><span>{options[selectedIndex]?.label ?? options[0]?.label ?? 'Select an option'}</span><ChevronDown size={15} /></button>
    {open && createPortal(<div ref={list} id={listId} role="listbox" aria-label={props['aria-label'] || 'Options'} className="select-options" style={position} onMouseDown={event => event.preventDefault()}>
      {options.map((option, index) => <div key={`${option.value}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={option.value === selected} aria-disabled={option.disabled} data-index={index} className={`select-option ${index === active ? 'highlighted' : ''} ${option.value === selected ? 'chosen' : ''}`} onMouseEnter={() => !option.disabled && setActive(index)} onClick={event => { event.stopPropagation(); choose(index); }}><span>{option.label}</span>{option.value === selected && <Check size={14} />}</div>)}
    </div>, document.body)}
  </>;
}
