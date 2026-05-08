import { escapeAttribute, escapeHtml } from "../html";

export interface CategorySectionView {
  id: string;
  title: string;
  cardsHtml: string;
  count: number;
  emptyText: string;
}

export function renderCategorySection(section: CategorySectionView): string {
  const sectionDomId = `section-${section.id}`;
  const sectionClass = `category-${section.id.replace(/[^a-z0-9_-]/gi, "-")}`;

  return `
    <section class="category-section ${escapeAttribute(sectionClass)}" aria-labelledby="${escapeAttribute(sectionDomId)}">
      <div class="section-heading">
        <h2 id="${escapeAttribute(sectionDomId)}">${escapeHtml(section.title)}</h2>
        <span>${section.count}</span>
      </div>
      ${
        section.count > 0
          ? `<div class="snippet-list">${section.cardsHtml}</div>`
          : `<p class="empty-state">${escapeHtml(section.emptyText)}</p>`
      }
    </section>
  `;
}
