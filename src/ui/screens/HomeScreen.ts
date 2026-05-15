import type { ToastState } from "../components/Toast";
import type { CategorySectionView } from "../components/CategorySection";
import { renderCategorySection } from "../components/CategorySection";
import { renderSearchBox } from "../components/SearchBox";
import { renderToast } from "../components/Toast";
import { escapeHtml } from "../html";
import type { UiTheme } from "../../app/state";

export interface HomeScreenView {
  appName: string;
  query: string;
  theme: UiTheme;
  sections: CategorySectionView[];
  toast: ToastState | null;
  modalHtml: string;
}

export function renderHomeScreen(view: HomeScreenView): string {
  const quickSection =
    view.sections.find((section) => section.id === "quick-access") ??
    view.sections.find((section) => section.id === "daily");
  const hiddenSectionIds = new Set(["favorites", quickSection?.id].filter(Boolean));
  const mainSections = view.sections.filter((section) => !hiddenSectionIds.has(section.id));

  return `
    <div class="app-shell" data-theme="${view.theme}">
      <header class="app-header">
        <div class="brand-lockup">
          <span class="brand-sigil" aria-hidden="true">M</span>
          <h1>${escapeHtml(view.appName)}</h1>
        </div>
        <div class="header-search">
          ${renderSearchBox(view.query)}
        </div>
        <div class="header-actions">
          <button class="secondary-button compact-button" type="button" data-action="toggle-theme">${view.theme === "dark" ? "Claro" : "Oscuro"}</button>
          <button class="secondary-button compact-button" type="button" data-action="import-json">Importar</button>
          <button class="secondary-button compact-button" type="button" data-action="export-json">Exportar</button>
          <button class="secondary-button compact-button" type="button" data-action="open-depurador">Depuración</button>
          <button class="secondary-button compact-button" type="button" data-action="open-settings">Avanzado</button>
          <button class="primary-button compact-button" type="button" data-action="new-snippet">Nuevo</button>
          <input class="visually-hidden" data-role="import-input" type="file" accept="application/json,.json" />
        </div>
      </header>
      <main class="console-layout">
        ${quickSection ? `<div class="quick-strip">${renderCategorySection(quickSection)}</div>` : ""}
        <div class="sections-stack phrase-feed">
          ${mainSections.map((section) => renderCategorySection(section)).join("")}
        </div>
      </main>
      ${renderToast(view.toast)}
      ${view.modalHtml}
    </div>
  `;
}
