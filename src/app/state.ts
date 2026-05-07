import type { AppData, GeneratedSnippetMap } from "../domain/types";
import type { ToastState } from "../ui/components/Toast";
import { loadAppData, loadGeneratedSnippets } from "../storage/appStorage";

export interface UiState {
  data: AppData;
  generated: GeneratedSnippetMap;
  query: string;
  editingSnippetId: string | null;
  isCreatingSnippet: boolean;
  settingsOpen: boolean;
  toast: ToastState | null;
}

export function createUiState(): UiState {
  return {
    data: loadAppData(),
    generated: loadGeneratedSnippets(),
    query: "",
    editingSnippetId: null,
    isCreatingSnippet: false,
    settingsOpen: false,
    toast: null,
  };
}
