import { describe, expect, it } from "vitest";
import type { BlockSlot, Template } from "./types";
import {
  avoidImmediateRepeat,
  generateFromTemplate,
  normalizeOutput,
  pickVariant,
} from "./snippetGenerator";

const template: Template = {
  id: "mensaje-demo",
  name: "Mensaje demo",
  pattern: "{apertura} {estado}{separador?} {accion?} {cierre?} {emoji?}",
  slotIds: ["apertura", "estado", "separador", "accion", "cierre", "emoji"],
  enabled: true,
};

const blocks: BlockSlot[] = [
  { id: "apertura", name: "Apertura", optional: false, variants: ["Listo"] },
  { id: "estado", name: "Estado", optional: false, variants: ["el dato quedo actualizado"] },
  { id: "separador", name: "Separador", optional: true, variants: [","] },
  { id: "accion", name: "Accion", optional: true, variants: ["podes continuar"] },
  { id: "cierre", name: "Cierre", optional: true, variants: ["gracias"] },
  { id: "emoji", name: "Emoji", optional: true, variants: [":)"] },
];

describe("normalizeOutput", () => {
  it("cleans placeholders, double spaces and punctuation spacing", () => {
    expect(normalizeOutput("Listo   {missing?} el dato ,  podes continuar !")).toBe(
      "Listo el dato, podes continuar!",
    );
  });
});

describe("pickVariant", () => {
  it("picks a deterministic variant", () => {
    expect(
      pickVariant(
        { id: "cierre", name: "Cierre", optional: false, variants: ["gracias", "saludos"] },
        { random: () => 0.99 },
      ),
    ).toBe("saludos");
  });
});

describe("avoidImmediateRepeat", () => {
  it("removes the previous value when another candidate exists", () => {
    expect(avoidImmediateRepeat("A", ["A", "B"])).toEqual(["B"]);
  });

  it("keeps the only candidate when no alternative exists", () => {
    expect(avoidImmediateRepeat("A", ["A"])).toEqual(["A"]);
  });
});

describe("generateFromTemplate", () => {
  it("generates without visible placeholders", () => {
    const output = generateFromTemplate(template, blocks, {
      random: () => 0,
      optionalProbability: 1,
    });

    expect(output).toBe("Listo el dato quedo actualizado, podes continuar gracias:)");
    expect(output).not.toContain("{");
  });

  it("cleans optional slots when they are skipped", () => {
    const output = generateFromTemplate(template, blocks, {
      random: () => 0.99,
      optionalProbability: 0,
    });

    expect(output).toBe("Listo el dato quedo actualizado");
    expect(output).not.toMatch(/\s{2,}/);
  });

  it("avoids repeating the exact previous output when possible", () => {
    const output = generateFromTemplate(
      template,
      [
        { id: "apertura", name: "Apertura", optional: false, variants: ["Listo", "Perfecto"] },
        { id: "estado", name: "Estado", optional: false, variants: ["el dato quedo actualizado"] },
      ],
      {
        previousValue: "Listo el dato quedo actualizado",
        avoidImmediateRepeats: true,
        random: () => 0.99,
        optionalProbability: 0,
      },
    );

    expect(output).toBe("Perfecto el dato quedo actualizado");
  });
});
