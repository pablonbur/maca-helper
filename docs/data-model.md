# Data Model

## AppData

```ts
interface AppData {
  version: number;
  categories: Category[];
  snippets: SnippetItem[];
  templates: Template[];
  blocks: BlockSlot[];
  settings: AppSettings;
}
```

## Category

```ts
interface Category {
  id: string;
  name: string;
  order: number;
}
```

## SnippetItem

```ts
type SnippetKind = "fixed" | "template";

interface SnippetItem {
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
```

## Template

```ts
interface Template {
  id: string;
  name: string;
  pattern: string;
  slotIds: string[];
  enabled: boolean;
}
```

## BlockSlot

```ts
interface BlockSlot {
  id: string;
  name: string;
  variants: string[];
  optional: boolean;
}
```

## AppSettings

```ts
interface AppSettings {
  appName: string;
  copyToastMs: number;
  rememberLastGenerated: boolean;
  avoidImmediateRepeats: boolean;
}
```

## Reglas

- `fixed` usa `content`.
- `template` usa `templateId`.
- Un snippet deshabilitado aparece atenuado.
- Un favorito aparece tambien en la seccion Favoritos.
- Los bloques son locales y curados.
