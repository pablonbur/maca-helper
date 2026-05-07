import type { AppData } from "../domain/types";

export interface ValidationResult {
  ok: boolean;
  data?: AppData;
  error?: string;
}

export function parseImportedAppData(rawJson: string): ValidationResult {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    return validateAppData(parsed);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }
}

export function validateAppData(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "El archivo no tiene la estructura principal esperada." };
  }

  const requiredArrays = ["categories", "snippets", "templates", "blocks"];
  const missingArray = requiredArrays.find((key) => !Array.isArray(value[key]));

  if (missingArray) {
    return { ok: false, error: `Falta la lista "${missingArray}" o no es válida.` };
  }

  if (!isRecord(value.settings)) {
    return { ok: false, error: "Falta la configuración de la app." };
  }

  if (typeof value.version !== "number") {
    return { ok: false, error: "La versión de datos no es válida." };
  }

  const data = value as unknown as AppData;

  const badCategory = data.categories.find(
    (category) =>
      typeof category.id !== "string" ||
      typeof category.name !== "string" ||
      typeof category.order !== "number",
  );

  if (badCategory) {
    return { ok: false, error: "Hay una categoría con datos inválidos." };
  }

  const categoryIds = new Set(data.categories.map((category) => category.id));

  const badSnippet = data.snippets.find((snippet) => {
    const commonInvalid =
      typeof snippet.id !== "string" ||
      (snippet.kind !== "fixed" && snippet.kind !== "template") ||
      typeof snippet.title !== "string" ||
      typeof snippet.categoryId !== "string" ||
      typeof snippet.favorite !== "boolean" ||
      typeof snippet.enabled !== "boolean" ||
      !categoryIds.has(snippet.categoryId);

    if (commonInvalid) {
      return true;
    }

    if (snippet.kind === "fixed") {
      return typeof snippet.content !== "string";
    }

    return typeof snippet.templateId !== "string";
  });

  if (badSnippet) {
    return { ok: false, error: "Hay un snippet con datos inválidos." };
  }

  const templateIds = new Set(data.templates.map((template) => template.id));
  const missingTemplate = data.snippets.find(
    (snippet) => snippet.kind === "template" && snippet.templateId && !templateIds.has(snippet.templateId),
  );

  if (missingTemplate) {
    return { ok: false, error: "Hay una plantilla variable que apunta a un template inexistente." };
  }

  const badTemplate = data.templates.find(
    (template) =>
      typeof template.id !== "string" ||
      typeof template.name !== "string" ||
      typeof template.pattern !== "string" ||
      !Array.isArray(template.slotIds) ||
      typeof template.enabled !== "boolean",
  );

  if (badTemplate) {
    return { ok: false, error: "Hay un template con datos inválidos." };
  }

  const badBlock = data.blocks.find(
    (block) =>
      typeof block.id !== "string" ||
      typeof block.name !== "string" ||
      !Array.isArray(block.variants) ||
      block.variants.some((variant) => typeof variant !== "string") ||
      typeof block.optional !== "boolean",
  );

  if (badBlock) {
    return { ok: false, error: "Hay un bloque de variantes con datos inválidos." };
  }

  if (
    typeof data.settings.appName !== "string" ||
    typeof data.settings.copyToastMs !== "number" ||
    typeof data.settings.rememberLastGenerated !== "boolean" ||
    typeof data.settings.avoidImmediateRepeats !== "boolean"
  ) {
    return { ok: false, error: "La configuración tiene datos inválidos." };
  }

  return { ok: true, data };
}

export function exportAppData(data: AppData): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `maca-helper-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
