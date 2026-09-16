export type ToastTone = "success" | "info" | "warning";

export type StudyToast = {
  id?: string;
  message: string;
  tone?: ToastTone;
};

export const toastEventName = "studytrack:toast";

export function showToast(message: string, tone: ToastTone = "info") {
  window.dispatchEvent(new CustomEvent<StudyToast>(toastEventName, { detail: { message, tone } }));
}
