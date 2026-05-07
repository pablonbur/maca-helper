import type { SnippetItem } from "../../domain/types";
import { escapeAttribute, escapeHtml } from "../html";

export interface SnippetCardView {
  snippet: SnippetItem;
  text: string;
  categoryName: string;
}

export function renderSnippetCard(view: SnippetCardView): string {
  const { snippet, text, categoryName } = view;
  const kindLabel = snippet.kind === "fixed" ? "Fijo" : "Variable";
  const favoriteLabel = snippet.favorite ? "Quitar favorito" : "Favorito";
  const favoriteText = snippet.favorite ? "Favorito" : "Fav";
  const disabledClass = snippet.enabled ? "" : "is-disabled";
  const regenerationButton =
    snippet.kind === "template"
      ? `<button class="secondary-button" type="button" data-action="regenerate" data-id="${escapeAttribute(snippet.id)}">Otra</button>`
      : "";

  return `
    <article class="snippet-card ${disabledClass}" data-card-id="${escapeAttribute(snippet.id)}" tabindex="0">
      <div class="snippet-card-main">
        <div class="snippet-card-topline">
          <h3>${escapeHtml(snippet.title)}</h3>
          <span class="kind-pill">${kindLabel}</span>
        </div>
        <p class="snippet-text">${escapeHtml(text)}</p>
        <div class="snippet-meta">
          <span>${escapeHtml(categoryName)}</span>
          ${snippet.enabled ? "" : "<span>Deshabilitado</span>"}
        </div>
      </div>
      <div class="snippet-actions">
        <button class="primary-button" type="button" data-action="copy" data-id="${escapeAttribute(snippet.id)}">Copiar</button>
        ${regenerationButton}
        <button class="secondary-button" type="button" data-action="edit" data-id="${escapeAttribute(snippet.id)}">Editar</button>
        <button class="secondary-button" type="button" data-action="favorite" data-id="${escapeAttribute(snippet.id)}" aria-label="${favoriteLabel}">${favoriteText}</button>
        <button class="danger-button" type="button" data-action="delete" data-id="${escapeAttribute(snippet.id)}">Borrar</button>
      </div>
    </article>
  `;
}
