import { createPortal } from "react-dom";
import { useRef, type ReactNode } from "react";
import { useDialogFocus } from "../hooks/useDialogFocus";

export function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, true);
  return createPortal(<div ref={ref} tabIndex={-1}>{children}</div>, document.body);
}
