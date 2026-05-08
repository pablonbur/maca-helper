import type { AppData } from "../../domain/types";
import { renderModal } from "../components/Modal";
import { escapeAttribute, escapeHtml } from "../html";

export function renderSettingsModal(data: AppData): string {
  const body = `
    <form id="settings-form" class="form-grid">
      <div class="field-row">
        <label>
          <span>Nombre de la app</span>
          <input name="appName" type="text" value="${escapeAttribute(data.settings.appName)}" />
        </label>
        <label>
          <span>Toast en ms</span>
          <input name="copyToastMs" type="number" min="400" max="5000" step="100" value="${data.settings.copyToastMs}" />
        </label>
      </div>
      <div class="checkbox-row">
        <label>
          <input name="rememberLastGenerated" type="checkbox" ${data.settings.rememberLastGenerated ? "checked" : ""} />
          Recordar variantes generadas
        </label>
        <label>
          <input name="avoidImmediateRepeats" type="checkbox" ${data.settings.avoidImmediateRepeats ? "checked" : ""} />
          Evitar repetición inmediata
        </label>
      </div>
      <div class="blocks-editor">
        ${data.blocks
          .map(
            (block) => `
              <section class="block-editor">
                <div class="field-row">
                  <label>
                    <span>Bloque</span>
                    <input name="block-name-${escapeAttribute(block.id)}" type="text" value="${escapeAttribute(block.name)}" />
                  </label>
                  <label class="checkbox-inline">
                    <input name="block-optional-${escapeAttribute(block.id)}" type="checkbox" ${block.optional ? "checked" : ""} />
                    Opcional
                  </label>
                </div>
                <label>
                  <span>Variantes</span>
                  <textarea name="block-variants-${escapeAttribute(block.id)}" rows="5">${escapeHtml(block.variants.join("\n"))}</textarea>
                </label>
              </section>
            `,
          )
          .join("")}
      </div>
    </form>
  `;

  const footer = `
    <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
    <button class="primary-button" type="submit" form="settings-form">Guardar</button>
  `;

  return renderModal({ title: "Variables avanzadas", body, footer, size: "wide" });
}
