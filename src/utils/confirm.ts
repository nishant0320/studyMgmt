export type Confirmation = {
  title?: string;
  note?: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
};
export const confirmEvent = 'studytrack:confirm';
export function confirmAction(message: string, options: Omit<Confirmation, 'message'> = {}): Promise<boolean> {
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent(confirmEvent, { detail: { ...options, message, resolve } }));
  });
}
