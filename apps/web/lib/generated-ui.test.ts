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

const quizPatchLines = [
  { op: "add", path: "/root", value: "main" },
  {
    op: "add",
    path: "/elements/title",
    value: {
      type: "Heading",
      props: { text: "Interaktiver Mini-Test: High Performance Computing", level: "3" },
      children: [],
    },
  },
  {
    op: "add",
    path: "/elements/quiz-panel",
    value: {
      type: "Quiz",
      props: {
        title: { $state: "/quiz/title" },
        intro: { $state: "/quiz/intro" },
        questions: { $state: "/quiz/questions" },
      },
      children: [],
    },
  },
  {
    op: "add",
    path: "/elements/main",
    value: {
      type: "Stack",
      props: { direction: "vertical", gap: "md", align: "stretch" },
      children: ["title", "quiz-panel"],
    },
  },
  { op: "add", path: "/state", value: {} },
  { op: "add", path: "/state/quiz", value: {} },
  { op: "add", path: "/state/quiz/title", value: "HPC-Kurztest" },
  { op: "add", path: "/state/quiz/intro", value: "Beantworte kurz und direkt." },
  { op: "add", path: "/state/quiz/questions", value: [] },
  {
    op: "add",
    path: "/state/quiz/questions/0",
    value: {
      prompt: "Was beschreibt Message Passing am besten?",
      type: "single",
      choices: ["Gemeinsamer globaler Speicher", "Nachrichten zwischen Prozessen", "Nur GPU-Speicher"],
      correct: [1],
      solution: ["Message Passing tauscht Daten als Nachrichten zwischen Prozessen aus."],
    },
  },
].map((line) => JSON.stringify(line));

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

  test("converts json-render patch lines into a spec without exposing raw JSON", () => {
    const chunks = splitGeneratedUIContent([
      "Klar, ich erstelle dir ein Quiz.",
      ...quizPatchLines,
    ].join("\n"));

    expect(chunks.map((chunk) => chunk.type)).toEqual(["markdown", "spec"]);
    const spec = chunks[1]?.type === "spec" ? chunks[1].spec : null;
    expect(spec?.root).toBe("main");
    expect(spec?.elements["quiz-panel"].type).toBe("Quiz");
    expect((spec?.elements["quiz-panel"].props as { title?: string } | undefined)?.title).toBe("HPC-Kurztest");
  });

  test("hides incomplete json-render patch streams behind a pending chunk", () => {
    const chunks = splitGeneratedUIContent([
      "Klar.",
      ...quizPatchLines.slice(0, 4),
      "{\"op\":\"add\",\"path\":\"/state/quiz",
    ].join("\n"));

    expect(chunks.map((chunk) => chunk.type)).toEqual(["markdown", "pending"]);
  });

  test("hides early truncated json-render patch lines", () => {
    const chunks = splitGeneratedUIContent("Klar.\n{\"op\":\"add\"");

    expect(chunks).toEqual([{ type: "markdown", text: "Klar.\n" }, { type: "pending" }]);
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

  test("strips json-render patch streams for previews and chat history", () => {
    const stripped = stripGeneratedUIBlocks([
      "Klar, ich erstelle dir ein Quiz.",
      ...quizPatchLines,
    ].join("\n"));

    expect(stripped).toBe("Klar, ich erstelle dir ein Quiz.");
  });
});
