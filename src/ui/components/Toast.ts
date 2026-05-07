import { escapeHtml } from "../html";

export type ToastTone = "success" | "error";

export interface ToastState {
  message: string;
  tone: ToastTone;
}

export function renderToast(toast: ToastState | null): string {
  if (!toast) {
    return "";
  }

  return `<div class="toast toast-${toast.tone}" role="status">${escapeHtml(toast.message)}</div>`;
}
