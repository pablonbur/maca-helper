import type { AppData, Category, SnippetItem, SnippetKind } from "../domain/types";
import { generateFromTemplate } from "../domain/snippetGenerator";
import { copyTextToClipboard } from "./events";
import { createUiState, type UiState } from "./state";
import { saveAppData, saveGeneratedSnippets } from "../storage/appStorage";
import { exportAppData, parseImportedAppData } from "../storage/importExport";
import { renderModal } from "../ui/components/Modal";
import type { CategorySectionView } from "../ui/components/CategorySection";
import { renderSnippetCard } from "../ui/components/SnippetCard";
import { renderHomeScreen } from "../ui/screens/HomeScreen";
import { renderSettingsModal } from "../ui/screens/SettingsScreen";
import { escapeAttribute, escapeHtml } from "../ui/html";

export function mountApp(root: HTMLElement): void {
  const app = new App(root);
  app.start();
}

class App {
  private state: UiState = createUiState();
  private toastTimer = 0;

  constructor(private readonly root: HTMLElement) {
    this.root.addEventListener("click", (event) => void this.handleClick(event));
    this.root.addEventListener("dblclick", (event) => this.handleDoubleClick(event));
    this.root.addEventListener("keydown", (event) => void this.handleKeydown(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    this.root.addEventListener("change", (event) => void this.handleChange(event));
    this.root.addEventListener("submit", (event) => this.handleSubmit(event));
  }

  start(): void {
    this.render();
  }

  private render(): void {
    this.root.innerHTML = renderHomeScreen({
      appName: this.state.data.settings.appName,
      query: this.state.query,
      sections: this.buildSections(),
      toast: this.state.toast,
      modalHtml: this.renderActiveModal(),
    });
  }

  private buildSections(): CategorySectionView[] {
    const snippets = this.getFilteredSnippets();
    const favorites = snippets.filter((snippet) => snippet.favorite);
    const categories = this.sortedCategories().filter((category) => category.id !== "favorites");

    return [
      {
        id: "favorites",
        title: "Favoritos",
        cardsHtml: this.renderCards(favorites),
        count: favorites.length,
        emptyText: "Todavía no hay favoritos.",
      },
      ...categories.map((category) => {
        const categorySnippets = snippets.filter((snippet) => snippet.categoryId === category.id);

        return {
          id: category.id,
          title: category.name,
          cardsHtml: this.renderCards(categorySnippets),
          count: categorySnippets.length,
          emptyText: "No hay items para mostrar.",
        };
      }),
    ];
  }

  private renderCards(snippets: SnippetItem[]): string {
    return snippets
      .map((snippet) =>
        renderSnippetCard({
          snippet,
          text: this.getSnippetText(snippet),
          categoryName: this.getCategoryName(snippet.categoryId),
        }),
      )
      .join("");
  }

  private renderActiveModal(): string {
    if (this.state.settingsOpen) {
      return renderSettingsModal(this.state.data);
    }

    if (this.state.isCreatingSnippet || this.state.editingSnippetId) {
      return this.renderSnippetModal();
    }

    return "";
  }

  private renderSnippetModal(): string {
    const existing = this.state.editingSnippetId
      ? this.state.data.snippets.find((snippet) => snippet.id === this.state.editingSnippetId)
      : undefined;
    const snippet = existing ?? this.createEmptySnippet();
    const title = existing ? "Editar snippet" : "Nuevo snippet";
    const categoryOptions = this.sortedCategories()
      .filter((category) => category.id !== "favorites")
      .map(
        (category) =>
          `<option value="${escapeAttribute(category.id)}" ${category.id === snippet.categoryId ? "selected" : ""}>${escapeHtml(category.name)}</option>`,
      )
      .join("");
    const templateOptions = this.state.data.templates
      .map(
        (template) =>
          `<option value="${escapeAttribute(template.id)}" ${template.id === snippet.templateId ? "selected" : ""}>${escapeHtml(template.name)}</option>`,
      )
      .join("");
    const fixedHidden = snippet.kind === "fixed" ? "" : "hidden";
    const templateHidden = snippet.kind === "template" ? "" : "hidden";

    const body = `
      <form id="snippet-form" class="form-grid">
        <div class="field-row">
          <label>
            <span>Título</span>
            <input name="title" type="text" value="${escapeAttribute(snippet.title)}" required />
          </label>
          <label>
            <span>Tipo</span>
            <select name="kind" data-role="kind-select">
              <option value="fixed" ${snippet.kind === "fixed" ? "selected" : ""}>Fijo</option>
              <option value="template" ${snippet.kind === "template" ? "selected" : ""}>Variable</option>
            </select>
          </label>
        </div>
        <div class="field-row">
          <label>
            <span>Categoría</span>
            <select name="categoryId">${categoryOptions}</select>
          </label>
          <div class="checkbox-column">
            <label><input name="favorite" type="checkbox" ${snippet.favorite ? "checked" : ""} /> Favorito</label>
            <label><input name="enabled" type="checkbox" ${snippet.enabled ? "checked" : ""} /> Habilitado</label>
          </div>
        </div>
        <div data-kind-panel="fixed" ${fixedHidden}>
          <label>
            <span>Texto copiable</span>
            <textarea name="content" rows="7">${escapeHtml(snippet.content ?? "")}</textarea>
          </label>
        </div>
        <div data-kind-panel="template" ${templateHidden}>
          <label>
            <span>Plantilla</span>
            <select name="templateId">${templateOptions}</select>
          </label>
        </div>
      </form>
    `;

    const footer = `
      <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
      <button class="primary-button" type="submit" form="snippet-form">Guardar</button>
    `;

    return renderModal({ title, body, footer });
  }

  private async handleClick(event: MouseEvent): Promise<void> {
    const target = event.target as HTMLElement;

    if (target.matches("[data-modal-backdrop]")) {
      this.closeModal();
      return;
    }

    const actionElement = target.closest<HTMLElement>("[data-action]");

    if (!actionElement) {
      this.handleCardClick(event);
      return;
    }

    const action = actionElement.dataset.action;
    const id = actionElement.dataset.id;

    if (action === "close-modal") {
      this.closeModal();
      return;
    }

    if (action === "new-snippet") {
      this.state.isCreatingSnippet = true;
      this.render();
      return;
    }

    if (action === "open-settings") {
      this.state.settingsOpen = true;
      this.render();
      return;
    }

    if (action === "export-json") {
      exportAppData(this.state.data);
      this.showToast("JSON exportado", "success");
      return;
    }

    if (action === "import-json") {
      this.root.querySelector<HTMLInputElement>('[data-role="import-input"]')?.click();
      return;
    }

    if (!id) {
      return;
    }

    if (action === "copy") {
      await this.copySnippet(id);
      return;
    }

    if (action === "edit") {
      this.state.editingSnippetId = id;
      this.render();
      return;
    }

    if (action === "favorite") {
      this.toggleFavorite(id);
      return;
    }

    if (action === "delete") {
      this.deleteSnippet(id);
      return;
    }

    if (action === "regenerate") {
      this.regenerateSnippet(id);
    }
  }

  private handleCardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>("[data-card-id]");

    if (!card || target.closest("button, input, textarea, select, a")) {
      return;
    }

    const id = card.dataset.cardId;

    if (id) {
      void this.copySnippet(id);
    }
  }

  private handleDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>("[data-card-id]");

    if (!card || target.closest("button, input, textarea, select, a")) {
      return;
    }

    const id = card.dataset.cardId;

    if (id) {
      this.state.editingSnippetId = id;
      this.render();
    }
  }

  private async handleKeydown(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>("[data-card-id]");

    if (!card || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    if (target.closest("button, input, textarea, select, a")) {
      return;
    }

    event.preventDefault();
    const id = card.dataset.cardId;

    if (id) {
      await this.copySnippet(id);
    }
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (!target.matches('[data-role="search"]')) {
      return;
    }

    const cursor = target.selectionStart ?? target.value.length;
    this.state.query = target.value;
    this.render();

    const nextSearch = this.root.querySelector<HTMLInputElement>('[data-role="search"]');
    nextSearch?.focus();
    nextSearch?.setSelectionRange(cursor, cursor);
  }

  private async handleChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | HTMLSelectElement;

    if (target.matches('[data-role="kind-select"]')) {
      this.toggleKindPanels(target.value as SnippetKind);
      return;
    }

    if (target.matches('[data-role="import-input"]')) {
      const fileInput = target as HTMLInputElement;
      const file = fileInput.files?.[0];

      if (!file) {
        return;
      }

      const raw = await file.text();
      fileInput.value = "";
      const result = parseImportedAppData(raw);

      if (!result.ok || !result.data) {
        this.showToast(result.error ?? "No se pudo importar el JSON", "error");
        return;
      }

      this.state.data = result.data;
      this.state.generated = {};
      this.persist();
      this.persistGenerated();
      this.showToast("JSON importado", "success");
    }
  }

  private handleSubmit(event: SubmitEvent): void {
    const form = event.target as HTMLFormElement;

    if (form.id === "snippet-form") {
      event.preventDefault();
      this.saveSnippetFromForm(form);
      return;
    }

    if (form.id === "settings-form") {
      event.preventDefault();
      this.saveSettingsFromForm(form);
    }
  }

  private toggleKindPanels(kind: SnippetKind): void {
    this.root.querySelectorAll<HTMLElement>("[data-kind-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.kindPanel !== kind;
    });
  }

  private async copySnippet(id: string): Promise<void> {
    const snippet = this.state.data.snippets.find((item) => item.id === id);

    if (!snippet) {
      return;
    }

    const text = this.getSnippetText(snippet);

    if (!text.trim()) {
      this.showToast("No hay texto para copiar", "error");
      return;
    }

    try {
      await copyTextToClipboard(text);
      this.showToast("Copiado", "success");
    } catch {
      this.showToast("No se pudo copiar", "error");
    }
  }

  private saveSnippetFromForm(form: HTMLFormElement): void {
    const formData = new FormData(form);
    const kind = this.formString(formData, "kind") as SnippetKind;
    const title = this.formString(formData, "title").trim();
    const categoryId = this.formString(formData, "categoryId");
    const now = new Date().toISOString();
    const existing = this.state.editingSnippetId
      ? this.state.data.snippets.find((snippet) => snippet.id === this.state.editingSnippetId)
      : undefined;

    if (!title) {
      this.showToast("El título es obligatorio", "error");
      return;
    }

    const item: SnippetItem = {
      id: existing?.id ?? createId(kind),
      kind,
      title,
      categoryId,
      favorite: formData.has("favorite"),
      enabled: formData.has("enabled"),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (kind === "fixed") {
      const content = this.formString(formData, "content").trim();

      if (!content) {
        this.showToast("El texto copiable es obligatorio", "error");
        return;
      }

      item.content = content;
    } else {
      const templateId = this.formString(formData, "templateId");

      if (!templateId) {
        this.showToast("Elegí una plantilla", "error");
        return;
      }

      item.templateId = templateId;
    }

    if (existing) {
      this.state.data.snippets = this.state.data.snippets.map((snippet) => (snippet.id === existing.id ? item : snippet));
      delete this.state.generated[existing.id];
    } else {
      this.state.data.snippets = [...this.state.data.snippets, item];
    }

    this.closeModal(false);
    this.persist();
    this.persistGenerated();
    this.showToast("Guardado", "success");
  }

  private saveSettingsFromForm(form: HTMLFormElement): void {
    const formData = new FormData(form);
    const nextData: AppData = JSON.parse(JSON.stringify(this.state.data)) as AppData;
    const appName = this.formString(formData, "appName").trim() || "Maca Helper";
    const toastMs = Number(this.formString(formData, "copyToastMs"));

    nextData.settings = {
      appName,
      copyToastMs: Number.isFinite(toastMs) ? Math.max(400, Math.min(5000, toastMs)) : 1200,
      rememberLastGenerated: formData.has("rememberLastGenerated"),
      avoidImmediateRepeats: formData.has("avoidImmediateRepeats"),
    };

    for (const block of nextData.blocks) {
      const name = this.formString(formData, `block-name-${block.id}`).trim();
      const variants = this.formString(formData, `block-variants-${block.id}`)
        .split(/\r?\n/)
        .map((variant) => variant.trim())
        .filter(Boolean);

      if (!name || variants.length === 0) {
        this.showToast("Cada bloque necesita nombre y variantes", "error");
        return;
      }

      block.name = name;
      block.variants = variants;
      block.optional = formData.has(`block-optional-${block.id}`);
    }

    this.state.data = nextData;
    this.state.generated = {};
    this.closeModal(false);
    this.persist();
    this.persistGenerated();
    this.showToast("Bloques guardados", "success");
  }

  private regenerateSnippet(id: string): void {
    const snippet = this.state.data.snippets.find((item) => item.id === id);

    if (!snippet || snippet.kind !== "template") {
      return;
    }

    this.state.generated[id] = this.generateTemplateText(snippet, this.state.generated[id]);
    this.persistGenerated();
    this.render();
  }

  private toggleFavorite(id: string): void {
    this.state.data.snippets = this.state.data.snippets.map((snippet) =>
      snippet.id === id ? { ...snippet, favorite: !snippet.favorite, updatedAt: new Date().toISOString() } : snippet,
    );
    this.persist();
    this.render();
  }

  private deleteSnippet(id: string): void {
    const snippet = this.state.data.snippets.find((item) => item.id === id);

    if (!snippet) {
      return;
    }

    const confirmed = window.confirm(`¿Borrar "${snippet.title}"?`);

    if (!confirmed) {
      return;
    }

    this.state.data.snippets = this.state.data.snippets.filter((item) => item.id !== id);
    delete this.state.generated[id];
    this.persist();
    this.persistGenerated();
    this.showToast("Borrado", "success");
  }

  private closeModal(shouldRender = true): void {
    this.state.editingSnippetId = null;
    this.state.isCreatingSnippet = false;
    this.state.settingsOpen = false;

    if (shouldRender) {
      this.render();
    }
  }

  private getFilteredSnippets(): SnippetItem[] {
    const query = foldSearch(this.state.query);

    if (!query) {
      return this.state.data.snippets;
    }

    return this.state.data.snippets.filter((snippet) => {
      const haystack = foldSearch(
        [snippet.title, this.getSnippetText(snippet), this.getCategoryName(snippet.categoryId)].join(" "),
      );
      return haystack.includes(query);
    });
  }

  private getSnippetText(snippet: SnippetItem): string {
    if (snippet.kind === "fixed") {
      return snippet.content ?? "";
    }

    if (this.state.generated[snippet.id]) {
      return this.state.generated[snippet.id];
    }

    const generated = this.generateTemplateText(snippet);
    this.state.generated[snippet.id] = generated;
    this.persistGenerated();
    return generated;
  }

  private generateTemplateText(snippet: SnippetItem, previousValue?: string): string {
    const template = this.state.data.templates.find((item) => item.id === snippet.templateId && item.enabled);

    if (!template) {
      return "";
    }

    return generateFromTemplate(template, this.state.data.blocks, {
      previousValue,
      avoidImmediateRepeats: this.state.data.settings.avoidImmediateRepeats,
    });
  }

  private getCategoryName(categoryId: string): string {
    return this.state.data.categories.find((category) => category.id === categoryId)?.name ?? "Sin categoría";
  }

  private sortedCategories(): Category[] {
    return [...this.state.data.categories].sort((a, b) => a.order - b.order);
  }

  private createEmptySnippet(): SnippetItem {
    const categoryId = this.sortedCategories().find((category) => category.id !== "favorites")?.id ?? "quick";
    const templateId = this.state.data.templates[0]?.id;
    const now = new Date().toISOString();

    return {
      id: createId("fixed"),
      kind: "fixed",
      title: "",
      categoryId,
      favorite: false,
      enabled: true,
      content: "",
      templateId,
      createdAt: now,
      updatedAt: now,
    };
  }

  private showToast(message: string, tone: "success" | "error"): void {
    window.clearTimeout(this.toastTimer);
    this.state.toast = { message, tone };
    this.render();
    this.toastTimer = window.setTimeout(() => {
      this.state.toast = null;
      this.render();
    }, this.state.data.settings.copyToastMs);
  }

  private persist(): void {
    saveAppData(this.state.data);
  }

  private persistGenerated(): void {
    saveGeneratedSnippets(this.state.data.settings.rememberLastGenerated ? this.state.generated : {});
  }

  private formString(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  }
}

function createId(prefix: SnippetKind): string {
  if (crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function foldSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}
