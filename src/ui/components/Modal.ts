import { escapeHtml } from "../html";

export interface ModalOptions {
  title: string;
  body: string;
  footer: string;
  size?: "default" | "wide" | "side";
}

export function renderModal(options: ModalOptions): string {
  const sizeClass = options.size === "wide" ? "modal-panel-wide" : "";
  const sideClass = options.size === "side" ? "modal-panel-side" : "";
  const backdropClass = options.size === "side" ? "modal-backdrop-side" : "";
  const panelTag = options.size === "side" ? "aside" : "section";

  return `
    <div class="modal-backdrop ${backdropClass}" data-modal-backdrop>
      <${panelTag} class="modal-panel ${sizeClass} ${sideClass}" role="dialog" aria-modal="true" aria-label="${escapeHtml(options.title)}">
        <header class="modal-header">
          <h2>${escapeHtml(options.title)}</h2>
          <button class="ghost-button icon-button" type="button" data-action="close-modal" aria-label="Cerrar">x</button>
        </header>
        <div class="modal-body">
          ${options.body}
        </div>
        <footer class="modal-footer">
          ${options.footer}
        </footer>
      </${panelTag}>
    </div>
  `;
}
