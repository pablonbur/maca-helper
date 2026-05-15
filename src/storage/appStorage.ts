import type { AppData, GeneratedSnippetMap } from "../domain/types";
import { cloneInitialData } from "./seedData";
import { validateAppData } from "./importExport";

const APP_DATA_KEY = "maca-helper:data:v1";
const GENERATED_KEY = "maca-helper:generated:v1";

export function loadAppData(): AppData {
  const raw = localStorage.getItem(APP_DATA_KEY);

  if (!raw) {
    const seed = cloneInitialData();
    saveAppData(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = validateAppData(parsed);

    if (result.ok && result.data) {
      const data = normalizeStoredData(result.data);
      saveAppData(data);
      return data;
    }
  } catch {
    // Fall through to seed data.
  }

  return cloneInitialData();
}

function normalizeStoredData(data: AppData): AppData {
  if (data.settings.appName !== "Maca Helper") {
    return data;
  }

  return {
    ...data,
    settings: {
      ...data.settings,
      appName: "Maca helper",
    },
  };
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(APP_DATA_KEY, JSON.stringify(normalizeStoredData(data)));
}

export function loadGeneratedSnippets(): GeneratedSnippetMap {
  const raw = localStorage.getItem(GENERATED_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isGeneratedMap(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

export function saveGeneratedSnippets(generated: GeneratedSnippetMap): void {
  localStorage.setItem(GENERATED_KEY, JSON.stringify(generated));
}

function isGeneratedMap(value: unknown): value is GeneratedSnippetMap {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === "string");
}
