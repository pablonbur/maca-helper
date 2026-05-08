import type { AppData, GeneratedSnippetMap } from "../domain/types";
import type { ToastState } from "../ui/components/Toast";
import { loadAppData, loadGeneratedSnippets } from "../storage/appStorage";

export type UiTheme = "dark" | "light";

export interface UiState {
  data: AppData;
  generated: GeneratedSnippetMap;
  query: string;
  theme: UiTheme;
  editingSnippetId: string | null;
  isCreatingSnippet: boolean;
  settingsOpen: boolean;
  copiedSnippetId: string | null;
  toast: ToastState | null;
}

export function createUiState(): UiState {
  return {
    data: loadAppData(),
    generated: loadGeneratedSnippets(),
    query: "",
    theme: loadThemePreference(),
    editingSnippetId: null,
    isCreatingSnippet: false,
    settingsOpen: false,
    copiedSnippetId: null,
    toast: null,
  };
}

export function saveThemePreference(theme: UiTheme): void {
  localStorage.setItem("maca-helper-theme", theme);
}

function loadThemePreference(): UiTheme {
  const value = localStorage.getItem("maca-helper-theme");
  return value === "light" ? "light" : "dark";
}
