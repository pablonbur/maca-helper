import { escapeHtml } from "../html";

export interface ModalOptions {
  title: string;
  body: string;
  footer: string;
  size?: "default" | "wide";
}

export function renderModal(options: ModalOptions): string {
  const sizeClass = options.size === "wide" ? "modal-panel-wide" : "";

  return `
    <div class="modal-backdrop" data-modal-backdrop>
      <section class="modal-panel ${sizeClass}" role="dialog" aria-modal="true" aria-label="${escapeHtml(options.title)}">
        <header class="modal-header">
          <h2>${escapeHtml(options.title)}</h2>
          <button class="ghost-button icon-button" type="button" data-action="close-modal" aria-label="Cerrar">×</button>
        </header>
        <div class="modal-body">
          ${options.body}
        </div>
        <footer class="modal-footer">
          ${options.footer}
        </footer>
      </section>
    </div>
  `;
}
