import type { SnippetItem } from "../../domain/types";
import { escapeAttribute, escapeHtml } from "../html";

export interface SnippetCardView {
  snippet: SnippetItem;
  text: string;
  categoryName: string;
  copied: boolean;
}

export function renderSnippetCard(view: SnippetCardView): string {
  const { snippet, text, categoryName, copied } = view;
  const kindLabel = snippet.kind === "fixed" ? "Fijo" : "Variable";
  const disabledClass = snippet.enabled ? "" : "is-disabled";
  const copiedClass = copied ? "is-copied" : "";
  const regenerationButton =
    snippet.kind === "template"
      ? `<button class="secondary-button row-button" type="button" data-action="regenerate" data-id="${escapeAttribute(snippet.id)}">Otra</button>`
      : "";
  const copiedBadge = copied ? `<span class="copied-badge">Copiado</span>` : `<span class="kind-pill">${kindLabel}</span>`;

  return `
    <article class="snippet-row ${disabledClass} ${copiedClass}" data-card-id="${escapeAttribute(snippet.id)}" tabindex="0" aria-label="Copiar ${escapeAttribute(snippet.title)}">
      <div class="snippet-row-main">
        <div class="snippet-card-topline">
          <span class="snippet-category">${escapeHtml(categoryName)}</span>
          <span class="snippet-title">${escapeHtml(snippet.title)}</span>
          ${copiedBadge}
        </div>
        <p class="snippet-text">${escapeHtml(text)}</p>
      </div>
      <div class="snippet-actions">
        <button class="primary-button row-button" type="button" data-action="copy" data-id="${escapeAttribute(snippet.id)}">Copiar</button>
        ${regenerationButton}
        <button class="secondary-button row-button" type="button" data-action="edit" data-id="${escapeAttribute(snippet.id)}">Editar</button>
      </div>
    </article>
  `;
}
