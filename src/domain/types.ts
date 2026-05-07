export type SnippetKind = "fixed" | "template";

export interface SnippetItem {
  id: string;
  kind: SnippetKind;
  title: string;
  categoryId: string;
  favorite: boolean;
  enabled: boolean;
  content?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  pattern: string;
  slotIds: string[];
  enabled: boolean;
}

export interface BlockSlot {
  id: string;
  name: string;
  variants: string[];
  optional: boolean;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface AppSettings {
  appName: string;
  copyToastMs: number;
  rememberLastGenerated: boolean;
  avoidImmediateRepeats: boolean;
}

export interface AppData {
  version: number;
  categories: Category[];
  snippets: SnippetItem[];
  templates: Template[];
  blocks: BlockSlot[];
  settings: AppSettings;
}

export interface GeneratedSnippetMap {
  [snippetId: string]: string;
}
