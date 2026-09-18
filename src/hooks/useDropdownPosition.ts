import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Measure the menu itself so wrapped labels and mobile keyboards stay in view. */
export function useDropdownPosition(open: boolean, anchor: RefObject<HTMLElement>, popup: RefObject<HTMLElement>, count: number, minWidth = 180, onDismiss?: () => void) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 320 });
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!anchor.current || !popup.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 12;
      const topEdge = (viewport?.offsetTop ?? 0) + 12;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 24;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 24;
      const below = Math.max(0, bottomEdge - rect.bottom - 6);
      const above = Math.max(0, rect.top - topEdge - 6);
      const upward = below < 220 && above > below;
      const list = popup.current.matches('[role="listbox"]') ? popup.current : popup.current.querySelector<HTMLElement>('[role="listbox"]');
      const naturalHeight = list ? list.scrollHeight + popup.current.clientHeight - list.clientHeight + 2 : popup.current.scrollHeight + 2;
      const maxHeight = Math.min(320, upward ? above : below);
      const height = Math.min(naturalHeight || 320, maxHeight);
      const width = Math.min(Math.max(rect.width, minWidth), rightEdge - leftEdge);
      const next = { left: Math.max(leftEdge, Math.min(rect.left, rightEdge - width)), top: Math.max(topEdge, upward ? rect.top - height - 6 : Math.min(rect.bottom + 6, bottomEdge - height)), width, maxHeight };
      setPosition(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    const scroll = (event: Event) => {
      if (popup.current?.contains(event.target as Node)) return;
      const rect = anchor.current?.getBoundingClientRect();
      if (rect && (rect.bottom < 0 || rect.top > window.innerHeight)) dismiss.current?.();
      else reposition();
    };
    reposition();
    window.addEventListener('scroll', scroll, true);
    const observer = new ResizeObserver(reposition);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    return () => { observer.disconnect(); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', reposition); window.visualViewport?.removeEventListener('resize', reposition); window.visualViewport?.removeEventListener('scroll', reposition); };
  }, [open, anchor, popup, count, minWidth]);
  return position;
}
