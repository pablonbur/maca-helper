import type {
  DepuradorConfig,
  DepuradorFile,
  DepuradorResult,
  DepuradorScheduleStatus,
} from "../../native/depurador";
import { renderModal } from "../components/Modal";
import { escapeAttribute, escapeHtml } from "../html";

export interface DepuradorScreenView {
  config: DepuradorConfig | null;
  result: DepuradorResult | null;
  schedule: DepuradorScheduleStatus | null;
  busy: boolean;
  busyLabel: string | null;
  error: string | null;
  message: string | null;
}

export function renderDepuradorModal(view: DepuradorScreenView): string {
  const body = view.config ? renderDepuradorBody(view) : renderLoadingBody(view);
  const disabled = view.busy || !view.config ? "disabled" : "";

  const footer = `
    <button class="secondary-button" type="button" data-action="close-modal">Cerrar</button>
    <button class="secondary-button" type="button" data-action="save-depurador" ${disabled}>Guardar configuración</button>
    <button class="secondary-button" type="button" data-action="preview-depurador" ${disabled}>Revisar PDFs</button>
    <button class="primary-button" type="button" data-action="run-depurador" ${disabled}>Mover PDFs a cuarentena</button>
  `;

  return renderModal({ title: "Depuración", body, footer, size: "wide" });
}

function renderLoadingBody(view: DepuradorScreenView): string {
  return `
    <section class="depurador-panel">
      ${view.error ? `<p class="depurador-error">${escapeHtml(view.error)}</p>` : renderBusy(view.busyLabel ?? "Cargando depurador...")}
    </section>
  `;
}

function renderDepuradorBody(view: DepuradorScreenView): string {
  const config = view.config;
  const busyDisabled = view.busy ? "disabled" : "";

  if (!config) {
    return renderLoadingBody(view);
  }

  return `
    <form id="depurador-form" class="form-grid depurador-form">
      ${view.error ? `<p class="depurador-error">${escapeHtml(view.error)}</p>` : ""}
      ${view.message ? `<p class="depurador-message">${escapeHtml(view.message)}</p>` : ""}
      ${view.busy ? renderBusy(view.busyLabel ?? "Trabajando...") : ""}
      <div class="depurador-status">
        <span>${renderScheduleText(view.schedule, config)}</span>
        <span>${view.busy ? "Acción en curso" : "Modo seguro: cuarentena"}</span>
      </div>
      <div class="depurador-folder-picker">
        <label>
          <span>Carpeta con PDFs</span>
          <input name="folder" type="text" value="${escapeAttribute(config.folder)}" readonly />
        </label>
        <button class="secondary-button" type="button" data-action="choose-depurador-folder" ${busyDisabled}>Elegir carpeta</button>
      </div>
      <div class="field-row depurador-wide-row">
        <label>
          <span>Cuarentena</span>
          <input name="quarantine_folder" type="text" value="${escapeAttribute(config.quarantine_folder)}" readonly />
        </label>
        <label>
          <span>PDFs a tomar</span>
          <select name="max_age_hours">
            ${renderPeriodOption(config.max_age_hours, 24, "Último día")}
            ${renderPeriodOption(config.max_age_hours, 168, "Última semana")}
            ${renderPeriodOption(config.max_age_hours, 720, "Último mes")}
            ${renderPeriodOption(config.max_age_hours, 0, "Todos los de la carpeta")}
          </select>
        </label>
      </div>
      <div class="depurador-quarantine-actions">
        <div>
          <strong>Carpeta de cuarentena</strong>
          <span>Revisá lo movido antes de mandarlo a la papelera.</span>
        </div>
        <div class="depurador-action-buttons">
          <button class="secondary-button" type="button" data-action="open-depurador-quarantine" ${busyDisabled}>Abrir cuarentena</button>
          <button class="danger-button" type="button" data-action="recycle-depurador-quarantine" ${busyDisabled}>Enviar cuarentena a papelera</button>
        </div>
      </div>
      <div class="field-row">
        <div class="depurador-field">
          <span>Automático</span>
          <label class="checkbox-inline depurador-inline-option">
            <input name="schedule_enabled" type="checkbox" ${config.schedule_enabled ? "checked" : ""} />
            Mover todos los días a la hora indicada
          </label>
        </div>
        <label>
          <span>Hora de ejecución</span>
          <input name="schedule_time" type="time" value="${escapeAttribute(config.schedule_time)}" />
        </label>
      </div>
      <div class="checkbox-row">
        <label>
          <input name="require_no_spaces" type="checkbox" ${config.require_no_spaces ? "checked" : ""} />
          Solo PDFs con nombres sin espacios
        </label>
      </div>
    </form>
    ${renderResult(view.result)}
  `;
}

function renderScheduleText(schedule: DepuradorScheduleStatus | null, config: DepuradorConfig): string {
  if (!schedule) {
    return config.schedule_enabled ? "Programación pendiente" : "Depuración diaria desactivada";
  }

  if (schedule.enabled && schedule.registered) {
    return `Automático activo: todos los días a las ${schedule.schedule_time}`;
  }

  if (schedule.enabled && !schedule.registered) {
    return "Automático marcado, pero falta guardar configuración para registrarlo en Windows";
  }

  return schedule.registered ? "Tarea de Windows registrada, pero desactivada en la app" : "Automático desactivado";
}

function renderResult(result: DepuradorResult | null): string {
  if (!result) {
    return `
      <section class="depurador-panel">
        <p class="depurador-muted">Primero revisá los PDFs detectados. Al moverlos, no se borran: van a la carpeta de cuarentena.</p>
      </section>
    `;
  }

  const rows = result.files.map((file) => renderFileRow(file, "candidate")).join("");
  const ignoredRows = result.ignored_files.map((file) => renderFileRow(file, "ignored")).join("");
  const errorRows = result.errors
    .map(
      (error) => `
        <li><strong>${escapeHtml(error.path)}:</strong> ${escapeHtml(error.message)}</li>
      `,
    )
    .join("");

  return `
    <section class="depurador-panel">
      <div class="depurador-summary">
        <span>Revisados: ${result.scanned}</span>
        <span>Detectados ahora: ${result.detected}</span>
        <span>No depurar: ${result.ignored_files.length}</span>
        <span>Errores: ${result.errors.length}</span>
      </div>
      <p class="depurador-muted">Doble click sobre un PDF para pasarlo entre "PDFs a mover" y "No depurar".</p>
      ${
        result.files.length > 0
          ? `
            <h3 class="depurador-list-title">PDFs a mover</h3>
            <div class="depurador-table-wrap">
              <table class="depurador-table">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Tamaño</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `
          : `<p class="depurador-muted">No quedan PDFs para mover con la configuración actual.</p>`
      }
      ${
        result.ignored_files.length > 0
          ? `
            <h3 class="depurador-list-title">No depurar</h3>
            <div class="depurador-table-wrap depurador-table-wrap-muted">
              <table class="depurador-table">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Tamaño</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>${ignoredRows}</tbody>
              </table>
            </div>
          `
          : ""
      }
      ${result.errors.length > 0 ? `<ul class="depurador-errors">${errorRows}</ul>` : ""}
    </section>
  `;
}

function renderFileRow(file: DepuradorFile, list: "candidate" | "ignored"): string {
  const title =
    list === "candidate"
      ? "Doble click para pasar este PDF a No depurar"
      : "Doble click para volver a incluir este PDF";

  return `
    <tr
      class="depurador-file-row depurador-file-row-${list}"
      data-depurador-list="${list}"
      data-depurador-path="${escapeAttribute(file.path)}"
      title="${escapeAttribute(title)}"
    >
      <td>${escapeHtml(file.name)}</td>
      <td>${formatKilobytes(file.size_kb)}</td>
      <td>${formatDate(file.created_at_ms)}</td>
    </tr>
  `;
}

function renderBusy(label: string): string {
  return `
    <div class="depurador-busy" role="status" aria-live="polite">
      <span class="depurador-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderPeriodOption(current: number, value: number, label: string): string {
  const selected = current === value ? "selected" : "";

  return `<option value="${value}" ${selected}>${escapeHtml(label)}</option>`;
}

function formatKilobytes(value: number): string {
  return `${Number.isFinite(value) ? value.toLocaleString("es-AR") : "0"} KB`;
}

function formatDate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
