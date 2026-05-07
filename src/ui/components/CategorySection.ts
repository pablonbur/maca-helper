import { escapeHtml } from "../html";

export interface CategorySectionView {
  id: string;
  title: string;
  cardsHtml: string;
  count: number;
  emptyText: string;
}

export function renderCategorySection(section: CategorySectionView): string {
  return `
    <section class="category-section" aria-labelledby="section-${section.id}">
      <div class="section-heading">
        <h2 id="section-${section.id}">${escapeHtml(section.title)}</h2>
        <span>${section.count}</span>
      </div>
      ${
        section.count > 0
          ? `<div class="snippet-grid">${section.cardsHtml}</div>`
          : `<p class="empty-state">${escapeHtml(section.emptyText)}</p>`
      }
    </section>
  `;
}
