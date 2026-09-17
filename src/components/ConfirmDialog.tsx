import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Portal } from "./Portal";
import { confirmEvent, type Confirmation } from "../utils/confirm";

type Request = Confirmation & { resolve: (confirmed: boolean) => void };
export function ConfirmDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const pending = useRef<Request | null>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      pending.current?.resolve(false);
      const next = (event as CustomEvent<Request>).detail;
      pending.current = next;
      setRequest(next);
    };
    window.addEventListener(confirmEvent, receive);
    return () => { window.removeEventListener(confirmEvent, receive); pending.current?.resolve(false); };
  }, []);
  if (!request) return null;
  const close = (confirmed: boolean) => {
    request.resolve(confirmed);
    pending.current = null;
    setRequest(null);
  };
  const destructive = request.destructive !== false;
  const action = request.confirmLabel || (/^Delete/i.test(request.message) ? "Delete" : /^Clear/i.test(request.message) ? "Clear data" : /^Replace/i.test(request.message) ? "Replace data" : "Continue");
  return <Portal><div className="modal confirm-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(false); }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(false); } }}>
    <section className="modal-panel confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <div className="confirm-heading"><span className={destructive ? 'confirm-icon danger-text' : 'confirm-icon'}><AlertTriangle size={22} /></span><button className="ghost icon-only" aria-label="Close confirmation" onClick={() => close(false)}><X size={18} /></button></div>
      <h2 id="confirm-title">{request.title || (action === 'Delete' ? 'Delete this item?' : action === 'Clear data' ? 'Clear your data?' : action === 'Replace data' ? 'Replace your workspace?' : 'Ready to continue?')}</h2>
      <p id="confirm-description">{request.message}</p>
      {destructive && <p className="confirm-note">{request.note ?? "This change cannot be undone. Keep a backup for anything you may need later."}</p>}
      <div className="modal-actions"><button autoFocus onClick={() => close(false)}>Cancel</button><button className={destructive ? 'danger confirm-submit' : 'primary confirm-submit'} onClick={() => close(true)}>{action}</button></div>
    </section>
  </div></Portal>;
}
