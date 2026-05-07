export function normalizeOutput(text: string): string {
  return text
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=\S)/g, "$1 ")
    .replace(/\s+…/g, "…")
    .replace(/…(?=\S)/g, "… ")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/([([])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
