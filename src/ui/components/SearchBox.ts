import { escapeAttribute } from "../html";

export function renderSearchBox(query: string): string {
  return `
    <label class="search-box">
      <span>Buscar</span>
      <input
        data-role="search"
        type="search"
        value="${escapeAttribute(query)}"
        placeholder="Buscar frase, link o dato"
        autocomplete="off"
      />
    </label>
  `;
}
