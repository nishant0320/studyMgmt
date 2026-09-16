import { useEffect, useRef, type RefObject } from "react";

/** Contain keyboard focus in the current overlay and restore its trigger. */
export function useDialogFocus(ref: RefObject<HTMLElement>, open: boolean) {
  const restoreTarget = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) restoreTarget.current = document.activeElement as HTMLElement | null;
  wasOpen.current = open;
  useEffect(() => {
    if (!open || !ref.current) return;
    const container = ref.current;
    const previous = restoreTarget.current;
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      if (!container.contains(document.activeElement)) (focusable()[0] ?? container).focus();
    });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); container.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    container.addEventListener("keydown", trap);
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, ref]);
}
