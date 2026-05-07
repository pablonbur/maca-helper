import type { BlockSlot, Template } from "./types";
import { normalizeOutput } from "./normalizer";

export { normalizeOutput } from "./normalizer";

export interface PickVariantOptions {
  random?: () => number;
  previousVariant?: string;
  avoidImmediateRepeats?: boolean;
}

export interface GenerateOptions extends PickVariantOptions {
  previousValue?: string;
  optionalProbability?: number;
  lightDecorationProbability?: number;
  lightDecorations?: string[];
}

const DEFAULT_OPTIONAL_PROBABILITY = 0.72;
const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 12;

export function pickVariant(slot: BlockSlot, options: PickVariantOptions = {}): string {
  const random = options.random ?? Math.random;
  const candidates = slot.variants.map((variant) => variant.trim()).filter(Boolean);

  if (candidates.length === 0) {
    return "";
  }

  const available =
    options.avoidImmediateRepeats && options.previousVariant
      ? avoidImmediateRepeat(options.previousVariant, candidates)
      : candidates;

  const index = Math.min(Math.floor(random() * available.length), available.length - 1);
  return available[index] ?? available[0] ?? "";
}

export function avoidImmediateRepeat(previousValue: string | undefined, candidates: string[]): string[] {
  const cleanCandidates = candidates.map((candidate) => candidate.trim()).filter(Boolean);

  if (!previousValue || cleanCandidates.length <= 1) {
    return cleanCandidates;
  }

  const filtered = cleanCandidates.filter((candidate) => candidate !== previousValue);
  return filtered.length > 0 ? filtered : cleanCandidates;
}

export function maybeApplyLightDecoration(text: string, options: GenerateOptions = {}): string {
  const decorations = options.lightDecorations ?? [];

  if (decorations.length === 0) {
    return text;
  }

  const random = options.random ?? Math.random;
  const probability = options.lightDecorationProbability ?? 0;

  if (random() > probability) {
    return text;
  }

  const decoration = decorations[Math.min(Math.floor(random() * decorations.length), decorations.length - 1)];
  return normalizeOutput(`${text} ${decoration ?? ""}`);
}

export function generateFromTemplate(
  template: Template,
  blocks: BlockSlot[],
  options: GenerateOptions = {},
): string {
  const attempts = options.avoidImmediateRepeats ? MAX_REPEAT_AVOIDANCE_ATTEMPTS : 1;
  let fallback = "";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = renderTemplateOnce(template, blocks, options);
    fallback = value || fallback;

    if (!value) {
      continue;
    }

    if (!options.avoidImmediateRepeats || !options.previousValue || value !== options.previousValue) {
      return value;
    }
  }

  return fallback || fallbackFromBlocks(blocks);
}

function renderTemplateOnce(template: Template, blocks: BlockSlot[], options: GenerateOptions): string {
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const random = options.random ?? Math.random;
  const optionalProbability = options.optionalProbability ?? DEFAULT_OPTIONAL_PROBABILITY;

  const rendered = template.pattern.replace(/\{([a-zA-Z0-9_-]+)(\?)?\}/g, (_match, slotId: string, marker: string) => {
    const slot = blockMap.get(slotId);

    if (!slot) {
      return "";
    }

    const isOptional = Boolean(marker) || slot.optional;

    if (isOptional && random() > optionalProbability) {
      return "";
    }

    return pickVariant(slot, options);
  });

  return maybeApplyLightDecoration(normalizeOutput(rendered), options);
}

function fallbackFromBlocks(blocks: BlockSlot[]): string {
  for (const block of blocks) {
    const value = pickVariant(block);

    if (value) {
      return normalizeOutput(value);
    }
  }

  return "Listo";
}
