import type { ToastState } from "../components/Toast";
import type { CategorySectionView } from "../components/CategorySection";
import { renderCategorySection } from "../components/CategorySection";
import { renderSearchBox } from "../components/SearchBox";
import { renderToast } from "../components/Toast";
import { escapeHtml } from "../html";

export interface HomeScreenView {
  appName: string;
  query: string;
  sections: CategorySectionView[];
  toast: ToastState | null;
  modalHtml: string;
}

export function renderHomeScreen(view: HomeScreenView): string {
  return `
    <div class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">Consola local</p>
          <h1>${escapeHtml(view.appName)}</h1>
        </div>
        <div class="header-actions">
          <button class="secondary-button" type="button" data-action="open-settings">Bloques</button>
          <button class="secondary-button" type="button" data-action="export-json">Exportar</button>
          <button class="secondary-button" type="button" data-action="import-json">Importar</button>
          <button class="primary-button" type="button" data-action="new-snippet">Nuevo</button>
          <input class="visually-hidden" data-role="import-input" type="file" accept="application/json,.json" />
        </div>
      </header>
      <main>
        <div class="toolbar">
          ${renderSearchBox(view.query)}
        </div>
        <div class="sections-stack">
          ${view.sections.map((section) => renderCategorySection(section)).join("")}
        </div>
      </main>
      ${renderToast(view.toast)}
      ${view.modalHtml}
    </div>
  `;
}
