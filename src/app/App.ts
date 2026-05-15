import type { AppData, Category, SnippetItem, SnippetKind } from "../domain/types";
import { generateFromTemplate } from "../domain/snippetGenerator";
import { copyTextToClipboard } from "./events";
import { createUiState, saveThemePreference, type UiState } from "./state";
import { saveAppData, saveGeneratedSnippets } from "../storage/appStorage";
import { exportAppData, parseImportedAppData } from "../storage/importExport";
import {
  getDepuradorConfig,
  getDepuradorScheduleStatus,
  isDepuradorAvailable,
  openDepuradorQuarantineFolder,
  previewDepuradorComprobantes,
  recycleDepuradorQuarantine,
  runDepuradorComprobantes,
  saveDepuradorConfig,
  selectDepuradorFolder,
  setDepuradorSchedule,
  type DepuradorConfig,
  type DepuradorFile,
} from "../native/depurador";
import { renderModal } from "../ui/components/Modal";
import type { CategorySectionView } from "../ui/components/CategorySection";
import { renderSnippetCard } from "../ui/components/SnippetCard";
import { renderHomeScreen } from "../ui/screens/HomeScreen";
import { renderDepuradorModal } from "../ui/screens/DepuradorScreen";
import { renderSettingsModal } from "../ui/screens/SettingsScreen";
import { escapeAttribute, escapeHtml } from "../ui/html";

const CARD_CLICK_COPY_DELAY_MS = 180;

export function mountApp(root: HTMLElement): void {
  const app = new App(root);
  app.start();
}

class App {
  private state: UiState = createUiState();
  private toastTimer = 0;
  private copyFlashTimer = 0;
  private cardClickTimer = 0;

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
    document.documentElement.dataset.theme = this.state.theme;
    this.root.innerHTML = renderHomeScreen({
      appName: this.state.data.settings.appName,
      query: this.state.query,
      theme: this.state.theme,
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
          copied: this.state.copiedSnippetId === snippet.id,
        }),
      )
      .join("");
  }

  private renderActiveModal(): string {
    if (this.state.settingsOpen) {
      return renderSettingsModal(this.state.data);
    }

    if (this.state.depuradorOpen) {
      return renderDepuradorModal({
        config: this.state.depuradorConfig,
        result: this.state.depuradorResult,
        schedule: this.state.depuradorSchedule,
        busy: this.state.depuradorBusy,
        busyLabel: this.state.depuradorBusyLabel,
        error: this.state.depuradorError,
        message: this.state.depuradorMessage,
      });
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

    return renderModal({ title, body, footer, size: "side" });
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

    if (action === "open-depurador") {
      await this.openDepurador();
      return;
    }

    if (action === "toggle-theme") {
      this.toggleTheme();
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

    if (action === "save-depurador") {
      await this.saveDepuradorSettings();
      return;
    }

    if (action === "choose-depurador-folder") {
      await this.chooseDepuradorFolder();
      return;
    }

    if (action === "preview-depurador") {
      await this.previewDepurador();
      return;
    }

    if (action === "run-depurador") {
      await this.runDepurador();
      return;
    }

    if (action === "open-depurador-quarantine") {
      await this.openDepuradorQuarantine();
      return;
    }

    if (action === "recycle-depurador-quarantine") {
      await this.recycleDepuradorQuarantine();
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
      this.openSnippetEditor(id);
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

    if (hasSelectionInside(card)) {
      return;
    }

    const id = card.dataset.cardId;

    if (id) {
      window.clearTimeout(this.cardClickTimer);
      this.cardClickTimer = window.setTimeout(() => {
        void this.copySnippet(id);
      }, CARD_CLICK_COPY_DELAY_MS);
    }
  }

  private handleDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const depuradorRow = target.closest<HTMLElement>("[data-depurador-path][data-depurador-list]");

    if (depuradorRow) {
      this.toggleDepuradorFile(depuradorRow.dataset.depuradorPath, depuradorRow.dataset.depuradorList);
      return;
    }

    const card = target.closest<HTMLElement>("[data-card-id]");

    if (!card || target.closest("button, input, textarea, select, a")) {
      return;
    }

    if (hasSelectionInside(card)) {
      return;
    }

    const id = card.dataset.cardId;

    if (id) {
      this.openSnippetEditor(id);
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
      this.markSnippetCopied(id);
      this.showToast(`Copiado: ${snippet.title}`, "success");
    } catch {
      this.showToast("No se pudo copiar", "error");
    }
  }

  private markSnippetCopied(id: string): void {
    window.clearTimeout(this.copyFlashTimer);
    this.state.copiedSnippetId = id;
    this.copyFlashTimer = window.setTimeout(() => {
      this.state.copiedSnippetId = null;
      this.render();
    }, 900);
  }

  private openSnippetEditor(id: string): void {
    window.clearTimeout(this.cardClickTimer);
    window.clearTimeout(this.copyFlashTimer);
    window.clearTimeout(this.toastTimer);

    this.state.copiedSnippetId = null;
    this.state.toast = null;
    this.state.editingSnippetId = id;
    this.render();
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
    const appName = this.formString(formData, "appName").trim() || "Maca helper";
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

  private async openDepurador(): Promise<void> {
    this.state.depuradorOpen = true;
    this.state.depuradorResult = null;
    this.state.depuradorError = null;
    this.state.depuradorMessage = null;
    this.render();

    if (!isDepuradorAvailable()) {
      this.state.depuradorConfig = null;
      this.state.depuradorSchedule = null;
      this.state.depuradorError = "El depurador está disponible en la app de escritorio.";
      this.render();
      return;
    }

    await this.loadDepurador();
  }

  private async loadDepurador(): Promise<void> {
    this.state.depuradorBusy = true;
    this.state.depuradorBusyLabel = "Cargando configuración del depurador...";
    this.render();

    try {
      const [config, schedule] = await Promise.all([getDepuradorConfig(), getDepuradorScheduleStatus()]);
      this.state.depuradorConfig = config;
      this.state.depuradorSchedule = schedule;
      this.state.depuradorError = null;
    } catch (error) {
      this.state.depuradorError = formatError(error);
    } finally {
      this.state.depuradorBusy = false;
      this.state.depuradorBusyLabel = null;
      this.render();
    }
  }

  private async saveDepuradorSettings(): Promise<void> {
    const config = this.readDepuradorConfigFromForm();

    if (!config) {
      return;
    }

    await this.withDepuradorBusy("Guardando configuración...", async () => {
      const saved = await saveDepuradorConfig(config);
      const schedule = await setDepuradorSchedule(saved.schedule_enabled, saved.schedule_time);
      this.state.depuradorConfig = saved;
      this.state.depuradorSchedule = schedule;
      this.state.depuradorError = null;
      this.state.depuradorMessage = "Configuración guardada.";
      this.showToast("Configuración guardada", "success");
    });
  }

  private async chooseDepuradorFolder(): Promise<void> {
    if (!isDepuradorAvailable()) {
      this.showToast("El selector de carpeta está disponible en la app de escritorio", "error");
      return;
    }

    const form = this.root.querySelector<HTMLFormElement>("#depurador-form");
    const currentFolder = this.readFormInput(form, "folder")?.value || this.state.depuradorConfig?.folder;

    try {
      const selected = await selectDepuradorFolder(currentFolder);

      if (!selected || !form) {
        return;
      }

      const folderInput = this.readFormInput(form, "folder");
      const quarantineInput = this.readFormInput(form, "quarantine_folder");

      if (folderInput) {
        folderInput.value = selected;
      }

      if (quarantineInput) {
        quarantineInput.value = buildQuarantineFolder(selected);
      }

      if (this.state.depuradorConfig) {
        this.state.depuradorConfig = {
          ...this.state.depuradorConfig,
          folder: selected,
          quarantine_folder: buildQuarantineFolder(selected),
          ignored_paths: [],
        };
        this.state.depuradorResult = null;
        this.state.depuradorMessage = "Carpeta actualizada. Revisá PDFs para ver el nuevo listado.";
        this.render();
      }
    } catch (error) {
      this.showToast(formatError(error), "error");
    }
  }

  private async previewDepurador(): Promise<void> {
    const config = this.readDepuradorConfigFromForm();

    if (!config) {
      return;
    }

    await this.withDepuradorBusy("Revisando PDFs en la carpeta...", async () => {
      const saved = await saveDepuradorConfig(config);
      const [result, schedule] = await Promise.all([
        previewDepuradorComprobantes(saved),
        getDepuradorScheduleStatus(),
      ]);
      this.state.depuradorConfig = saved;
      this.state.depuradorResult = result;
      this.state.depuradorSchedule = schedule;
      this.state.depuradorError = null;
      this.state.depuradorMessage = `Revisión lista: ${result.detected} PDF${result.detected === 1 ? "" : "s"} detectado${result.detected === 1 ? "" : "s"}.`;
      this.showToast(`Detectados: ${result.detected}`, result.errors.length > 0 ? "error" : "success");
    });
  }

  private async runDepurador(): Promise<void> {
    const config = this.readDepuradorConfigFromForm();

    if (!config) {
      return;
    }

    await this.withDepuradorBusy("Moviendo PDFs a cuarentena...", async () => {
      const saved = await saveDepuradorConfig(config);
      const moveResult = await runDepuradorComprobantes(saved);
      this.state.depuradorBusyLabel = "Actualizando listado...";
      this.render();
      const [result, schedule] = await Promise.all([
        previewDepuradorComprobantes(saved),
        getDepuradorScheduleStatus(),
      ]);
      this.state.depuradorConfig = saved;
      this.state.depuradorResult = result;
      this.state.depuradorSchedule = schedule;
      this.state.depuradorError = null;
      this.state.depuradorMessage = `Se movieron ${moveResult.moved} PDF${moveResult.moved === 1 ? "" : "s"} a cuarentena. El listado ya muestra lo que queda en la carpeta.`;
      this.showToast(
        `PDFs movidos con éxito: ${moveResult.moved}`,
        moveResult.errors.length > 0 ? "error" : "success",
      );
    });
  }

  private toggleDepuradorFile(path: string | undefined, list: string | undefined): void {
    if (
      !path ||
      (list !== "candidate" && list !== "ignored") ||
      !this.state.depuradorConfig ||
      !this.state.depuradorResult ||
      this.state.depuradorBusy
    ) {
      return;
    }

    const result = this.state.depuradorResult;
    const source = list === "candidate" ? result.files : result.ignored_files;
    const file = source.find((item) => samePath(item.path, path));

    if (!file) {
      return;
    }

    const nextFiles =
      list === "candidate"
        ? result.files.filter((item) => !samePath(item.path, path))
        : sortDepuradorFiles([...result.files, file]);
    const nextIgnoredFiles =
      list === "candidate"
        ? sortDepuradorFiles([...result.ignored_files, file])
        : result.ignored_files.filter((item) => !samePath(item.path, path));
    const nextIgnoredPaths =
      list === "candidate"
        ? addIgnoredPath(this.state.depuradorConfig.ignored_paths, path)
        : removeIgnoredPath(this.state.depuradorConfig.ignored_paths, path);

    this.state.depuradorConfig = {
      ...this.state.depuradorConfig,
      ignored_paths: nextIgnoredPaths,
    };
    this.state.depuradorResult = {
      ...result,
      detected: nextFiles.length,
      files: nextFiles,
      ignored_files: nextIgnoredFiles,
    };
    this.state.depuradorMessage =
      list === "candidate"
        ? "PDF marcado como No depurar. Doble click en esa lista para volver a incluirlo."
        : "PDF vuelto a incluir para depuración.";
    this.render();
  }

  private async openDepuradorQuarantine(): Promise<void> {
    const config = this.readDepuradorConfigFromForm();

    if (!config) {
      return;
    }

    await this.withDepuradorBusy("Abriendo carpeta de cuarentena...", async () => {
      const saved = await saveDepuradorConfig(config);
      await openDepuradorQuarantineFolder();
      this.state.depuradorConfig = saved;
      this.state.depuradorError = null;
    });
  }

  private async recycleDepuradorQuarantine(): Promise<void> {
    const confirmed = window.confirm("¿Enviar todos los archivos de la cuarentena a la papelera de Windows?");

    if (!confirmed) {
      return;
    }

    await this.withDepuradorBusy("Enviando cuarentena a la papelera...", async () => {
      const result = await recycleDepuradorQuarantine();
      this.state.depuradorError = null;
      this.state.depuradorMessage = `Se enviaron ${result.recycled} archivo${result.recycled === 1 ? "" : "s"} de cuarentena a la papelera.`;
      this.showToast(
        `Cuarentena enviada a papelera: ${result.recycled}`,
        result.errors.length > 0 ? "error" : "success",
      );
    });
  }

  private async withDepuradorBusy(label: string, action: () => Promise<void>): Promise<void> {
    if (!isDepuradorAvailable()) {
      this.showToast("El depurador está disponible en la app de escritorio", "error");
      return;
    }

    this.state.depuradorBusy = true;
    this.state.depuradorBusyLabel = label;
    this.state.depuradorError = null;
    this.render();

    try {
      await action();
    } catch (error) {
      this.state.depuradorError = formatError(error);
      this.showToast("No se pudo completar la depuración", "error");
    } finally {
      this.state.depuradorBusy = false;
      this.state.depuradorBusyLabel = null;
      this.render();
    }
  }

  private readDepuradorConfigFromForm(): DepuradorConfig | null {
    const form = this.root.querySelector<HTMLFormElement>("#depurador-form");
    const current = this.state.depuradorConfig;

    if (!form || !current) {
      return null;
    }

    const formData = new FormData(form);
    const maxAge = Number(this.formString(formData, "max_age_hours"));

    return {
      ...current,
      folder: this.formString(formData, "folder").trim(),
      quarantine_folder: this.formString(formData, "quarantine_folder").trim(),
      max_age_hours: Number.isFinite(maxAge) ? Math.max(0, Math.min(720, Math.round(maxAge))) : current.max_age_hours,
      require_no_spaces: formData.has("require_no_spaces"),
      schedule_enabled: formData.has("schedule_enabled"),
      schedule_time: this.formString(formData, "schedule_time").trim() || current.schedule_time,
    };
  }

  private readFormInput(form: HTMLFormElement | null, name: string): HTMLInputElement | null {
    const element = form?.elements.namedItem(name);

    return element instanceof HTMLInputElement ? element : null;
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

  private toggleTheme(): void {
    this.state.theme = this.state.theme === "dark" ? "light" : "dark";
    saveThemePreference(this.state.theme);
    this.render();
  }

  private closeModal(shouldRender = true): void {
    this.state.editingSnippetId = null;
    this.state.isCreatingSnippet = false;
    this.state.settingsOpen = false;
    this.state.depuradorOpen = false;
    this.state.depuradorBusy = false;
    this.state.depuradorBusyLabel = null;
    this.state.depuradorError = null;
    this.state.depuradorMessage = null;

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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Error inesperado";
}

function buildQuarantineFolder(folder: string): string {
  const trimmed = folder.replace(/[\\/]+$/, "");
  const separator = trimmed.includes("/") && !trimmed.includes("\\") ? "/" : "\\";

  return `${trimmed}${separator}_MacaHelper_Depurador`;
}

function sortDepuradorFiles(files: DepuradorFile[]): DepuradorFile[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

function addIgnoredPath(paths: string[], path: string): string[] {
  return paths.some((item) => samePath(item, path)) ? paths : [...paths, path];
}

function removeIgnoredPath(paths: string[], path: string): string[] {
  return paths.filter((item) => !samePath(item, path));
}

function samePath(first: string, second: string): boolean {
  return normalizePathKey(first) === normalizePathKey(second);
}

function normalizePathKey(path: string): string {
  return path.replace(/\//g, "\\").toLocaleLowerCase("es");
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

function hasSelectionInside(element: HTMLElement): boolean {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    return false;
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  return Boolean(
    (anchorNode && element.contains(anchorNode)) ||
      (focusNode && element.contains(focusNode)),
  );
}
