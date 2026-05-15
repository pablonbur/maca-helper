import type { AppData, GeneratedSnippetMap } from "../domain/types";
import type {
  DepuradorConfig,
  DepuradorResult,
  DepuradorScheduleStatus,
} from "../native/depurador";
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
  depuradorOpen: boolean;
  depuradorBusy: boolean;
  depuradorBusyLabel: string | null;
  depuradorConfig: DepuradorConfig | null;
  depuradorResult: DepuradorResult | null;
  depuradorSchedule: DepuradorScheduleStatus | null;
  depuradorError: string | null;
  depuradorMessage: string | null;
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
    depuradorOpen: false,
    depuradorBusy: false,
    depuradorBusyLabel: null,
    depuradorConfig: null,
    depuradorResult: null,
    depuradorSchedule: null,
    depuradorError: null,
    depuradorMessage: null,
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
