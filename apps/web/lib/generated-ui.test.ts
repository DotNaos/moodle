import { describe, expect, test } from "bun:test";

import { splitGeneratedUIContent, stripGeneratedUIBlocks } from "@/lib/generated-ui";

const validSpec = {
  root: "panel",
  elements: {
    panel: {
      type: "Panel",
      props: { title: "Feedback", tone: "info" },
      children: ["steps"],
    },
    steps: {
      type: "Steps",
      props: {
        items: [
          { title: "Definition nennen", detail: "Erklaere den Begriff zuerst.", status: "done" },
          { title: "Beispiel ergaenzen", detail: "Zeige die Regel an einem Zahlenbeispiel.", status: "current" },
        ],
      },
      children: [],
    },
  },
};

describe("generated UI content", () => {
  test("splits markdown and a valid json-render block", () => {
    const chunks = splitGeneratedUIContent([
      "Guter Start.",
      "",
      "```json-render",
      JSON.stringify(validSpec),
      "```",
      "",
      "Weiter so.",
    ].join("\n"));

    expect(chunks.map((chunk) => chunk.type)).toEqual(["markdown", "spec", "markdown"]);
    expect(chunks[0]).toEqual({ type: "markdown", text: "Guter Start.\n\n" });
    expect(chunks[1]?.type === "spec" ? chunks[1].spec.elements.panel.visible : "missing").toBe(undefined);
    expect(chunks[2]).toEqual({ type: "markdown", text: "\n\nWeiter so." });
  });

  test("does not expose invalid json-render blocks as raw markdown", () => {
    const chunks = splitGeneratedUIContent([
      "Vorher",
      "",
      "```json-render",
      JSON.stringify({
        root: "bad",
        elements: {
          bad: { type: "Unknown", props: {}, children: [] },
        },
      }),
      "```",
    ].join("\n"));

    expect(chunks.map((chunk) => chunk.type)).toEqual(["markdown", "error"]);
  });

  test("accepts an interactive quiz spec", () => {
    const chunks = splitGeneratedUIContent([
      "Ich frage dich ab.",
      "",
      "```json-render",
      JSON.stringify({
        root: "quiz",
        elements: {
          quiz: {
            type: "Quiz",
            props: {
              title: "Mini-Quiz",
              intro: "Beantworte die Fragen nacheinander.",
              questions: [
                {
                  title: "Grundbegriff",
                  prompt: "Was bedeutet eine stabile Schnittstelle?",
                  type: "open",
                  solution: ["Sie bleibt fuer Nutzer vorhersagbar, auch wenn intern umgebaut wird."],
                },
                {
                  title: "Auswahl",
                  prompt: "Welche Aussage passt zu Generative UI?",
                  type: "single",
                  choices: ["Die KI schreibt beliebiges HTML.", "Die KI waehlt erlaubte Komponenten aus.", "Die UI ist immer fest."],
                  correct: [1],
                  solution: ["Die Ausgabe bleibt auf den erlaubten Komponenten-Katalog begrenzt."],
                },
              ],
            },
            children: [],
          },
        },
      }),
      "```",
    ].join("\n"));

    expect(chunks.map((chunk) => chunk.type)).toEqual(["markdown", "spec"]);
    const spec = chunks[1]?.type === "spec" ? chunks[1].spec : null;
    expect(spec?.elements.quiz.type).toBe("Quiz");
  });

  test("hides incomplete streaming fences behind a pending chunk", () => {
    const chunks = splitGeneratedUIContent("Antwort\n\n```json-render\n{\"root\"");

    expect(chunks).toEqual([{ type: "markdown", text: "Antwort\n\n" }, { type: "pending" }]);
  });

  test("hides pure incomplete streaming fences", () => {
    const chunks = splitGeneratedUIContent("```json-render\n{\"root\"");

    expect(chunks).toEqual([{ type: "pending" }]);
  });

  test("strips json-render blocks for previews and chat history", () => {
    const stripped = stripGeneratedUIBlocks([
      "Kurzfassung",
      "",
      "```json-render",
      JSON.stringify(validSpec),
      "```",
    ].join("\n"));

    expect(stripped).toBe("Kurzfassung");
  });

  test("strips incomplete json-render blocks for previews and chat history", () => {
    const stripped = stripGeneratedUIBlocks("Kurzfassung\n\n```json-render\n{\"root\"");

    expect(stripped).toBe("Kurzfassung");
  });
});
