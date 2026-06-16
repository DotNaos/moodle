"use client";

import { ActionProvider, Renderer, StateProvider, VisibilityProvider, defineRegistry } from "@json-render/react";
import { ArrowRight, CheckCircle2, Circle, Eye, FileQuestion, RotateCcw } from "lucide-react";
import { Component, useMemo, useState, type ReactNode } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThinkingDots } from "@/components/ui/thinking-dots";
import { generatedUICatalog, splitGeneratedUIContent, type GeneratedUISpec } from "@/lib/generated-ui";
import { cn } from "@/lib/utils";

type GeneratedUIContentProps = {
  className?: string;
  renderMarkdown?: (text: string) => ReactNode;
  text: string;
};

const { registry } = defineRegistry(generatedUICatalog, {
  components: {
    Stack: ({ props, children }) => {
      const stack = props as StackProps;
      return (
        <div
          className={cn(
            "flex min-w-0",
            stack.direction === "horizontal" ? "flex-col sm:flex-row" : "flex-col",
            gapClass(stack.gap),
            stack.align === "center" ? "items-center" : stack.align === "stretch" ? "items-stretch" : "items-start",
          )}
        >
          {children}
        </div>
      );
    },
    Panel: ({ props, children }) => {
      const panel = props as PanelProps;
      return (
        <section className={cn("min-w-0 rounded-2xl px-4 py-3", toneSurfaceClass(panel.tone))}>
          {panel.title ? <h3 className="mb-2 text-sm font-semibold tracking-tight">{panel.title}</h3> : null}
          <div className="min-w-0">{children}</div>
        </section>
      );
    },
    Heading: ({ props }) => {
      const heading = props as HeadingProps;
      const className = cn(
        "font-semibold tracking-tight text-foreground",
        heading.level === "2" ? "text-lg" : heading.level === "4" ? "text-sm" : "text-base",
      );
      if (heading.level === "2") {
        return <h2 className={className}>{heading.text}</h2>;
      }
      if (heading.level === "4") {
        return <h4 className={className}>{heading.text}</h4>;
      }
      return <h3 className={className}>{heading.text}</h3>;
    },
    Text: ({ props }) => {
      const text = props as TextProps;
      return (
        <p
          className={cn(
            "whitespace-pre-wrap text-sm leading-relaxed",
            text.emphasis === "strong" ? "font-semibold" : "",
            toneTextClass(text.tone),
          )}
        >
          {text.text}
        </p>
      );
    },
    Callout: ({ props }) => {
      const callout = props as CalloutProps;
      return (
        <div className={cn("rounded-2xl px-3.5 py-3 text-sm", toneSurfaceClass(callout.tone))}>
          {callout.title ? <p className="mb-1 font-semibold">{callout.title}</p> : null}
          <p className="whitespace-pre-wrap leading-relaxed">{callout.body}</p>
        </div>
      );
    },
    List: ({ props }) => {
      const list = props as ListProps;
      const ListTag = list.ordered ? "ol" : "ul";
      return (
        <ListTag className={cn("space-y-1 text-sm leading-relaxed", list.ordered ? "ml-5 list-decimal" : "ml-5 list-disc")}>
          {list.items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}
        </ListTag>
      );
    },
    Steps: ({ props }) => {
      const steps = props as StepsProps;
      return (
        <ol className="flex flex-col gap-2">
          {steps.items.map((item, index) => (
            <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2" key={`${index}:${item.title}`}>
              <span
                className={cn(
                  "mt-0.5 grid size-6 place-items-center rounded-full text-xs font-semibold",
                  item.status === "done"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : item.status === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">{item.title}</span>
                {item.detail ? <span className="block text-sm leading-relaxed text-muted-foreground">{item.detail}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      );
    },
    FactGrid: ({ props }) => {
      const grid = props as FactGridProps;
      return (
        <dl className="grid gap-2 sm:grid-cols-2">
          {grid.items.map((item, index) => (
            <div className="min-w-0 rounded-2xl bg-background/60 px-3 py-2" key={`${index}:${item.label}`}>
              <dt className="truncate text-xs font-medium text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold">{item.value}</dd>
              {item.detail ? <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</dd> : null}
            </div>
          ))}
        </dl>
      );
    },
    Badge: ({ props }) => {
      const badge = props as BadgeProps;
      return <Badge variant={badge.tone === "danger" ? "destructive" : "secondary"}>{badge.label}</Badge>;
    },
    Quiz: ({ props }) => <InlineQuiz quiz={props as QuizProps} />,
  },
  actions: {},
});

export function GeneratedUIContent({ className, renderMarkdown, text }: GeneratedUIContentProps) {
  const chunks = splitGeneratedUIContent(text);
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {chunks.map((chunk, index) => {
        if (chunk.type === "markdown") {
          return (
            <div key={`markdown:${index}`}>
              {renderMarkdown ? renderMarkdown(chunk.text) : <MarkdownRenderer className="text-sm leading-relaxed" text={chunk.text} />}
            </div>
          );
        }
        if (chunk.type === "pending") {
          return <GeneratedUIPending key={`pending:${index}`} />;
        }
        if (chunk.type === "error") {
          return <GeneratedUIUnavailable key={`error:${index}`} />;
        }
        return (
          <GeneratedUIBoundary fallback={<GeneratedUIUnavailable />} key={`spec:${index}`}>
            <GeneratedUISpecView spec={chunk.spec} />
          </GeneratedUIBoundary>
        );
      })}
    </div>
  );
}

function GeneratedUIPending() {
  return (
    <div className="inline-flex items-center gap-2 py-1 text-muted-foreground" role="status">
      <FileQuestion className="size-4" />
      <ThinkingDots label="Creating Test" />
    </div>
  );
}

function GeneratedUIUnavailable() {
  return (
    <div className="inline-flex items-center gap-2 py-1 text-sm text-muted-foreground">
      <FileQuestion className="size-4" />
      <span>Test konnte nicht angezeigt werden.</span>
    </div>
  );
}

function GeneratedUISpecView({ spec }: { spec: GeneratedUISpec }) {
  return (
    <div className="min-w-0 text-foreground">
      <StateProvider initialState={(spec as { state?: Record<string, unknown> }).state ?? {}}>
        <ActionProvider handlers={{}}>
          <VisibilityProvider>
            <Renderer registry={registry} spec={spec} />
          </VisibilityProvider>
        </ActionProvider>
      </StateProvider>
    </div>
  );
}

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
type StackProps = {
  align?: "start" | "center" | "stretch";
  direction?: "vertical" | "horizontal";
  gap?: "xs" | "sm" | "md" | "lg";
};
type PanelProps = { title?: string; tone?: Tone };
type HeadingProps = { text: string; level?: "2" | "3" | "4" };
type TextProps = { text: string; tone?: Tone; emphasis?: "normal" | "strong" };
type CalloutProps = { title?: string; body: string; tone?: Tone };
type ListProps = { items: string[]; ordered?: boolean };
type StepsProps = { items: Array<{ title: string; detail?: string; status?: "todo" | "current" | "done" }> };
type FactGridProps = { items: Array<{ label: string; value: string; detail?: string }> };
type BadgeProps = { label: string; tone?: Tone };
type QuizQuestionProps = {
  choices?: string[];
  correct?: number[];
  prompt: string;
  solution?: string[];
  title?: string;
  type?: "open" | "single" | "multiple";
};
type QuizProps = {
  intro?: string;
  questions: QuizQuestionProps[];
  title?: string;
};
type NormalizedQuizQuestion = {
  choices: string[];
  correct: number[];
  prompt: string;
  solution: string[];
  title?: string;
  type: "open" | "single" | "multiple";
};

function InlineQuiz({ quiz }: { quiz: QuizProps }) {
  const questions = useMemo(
    () => quiz.questions.map(normalizeQuizQuestion).filter((question) => question.prompt.trim().length > 0),
    [quiz.questions],
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (questions.length === 0) {
    return null;
  }

  const currentIndex = Math.min(index, questions.length - 1);
  const question = questions[currentIndex];
  const answer = answers[currentIndex] ?? "";
  const selected = parseSelection(answer);
  const isChoiceQuestion = question.type !== "open" && question.choices.length >= 2;
  const hasAnswer = isChoiceQuestion ? selected.length > 0 : answer.trim().length > 0;
  const isChecked = Boolean(checked[currentIndex]);
  const isRevealed = Boolean(revealed[currentIndex]);
  const canAutoCheck = isChoiceQuestion && question.correct.length > 0;
  const isCorrect = canAutoCheck ? sameSelection(selected, question.correct) : false;
  const isLast = currentIndex === questions.length - 1;

  function setAnswer(nextAnswer: string) {
    setAnswers((current) => ({ ...current, [currentIndex]: nextAnswer }));
    setChecked((current) => ({ ...current, [currentIndex]: false }));
  }

  function toggleChoice(choiceIndex: number) {
    if (question.type === "multiple") {
      const next = selected.includes(choiceIndex)
        ? selected.filter((item) => item !== choiceIndex)
        : [...selected, choiceIndex].sort((left, right) => left - right);
      setAnswer(next.join(","));
      return;
    }
    setAnswer(String(choiceIndex));
  }

  function checkCurrent() {
    if (!hasAnswer) {
      return;
    }
    setChecked((current) => ({ ...current, [currentIndex]: true }));
  }

  function revealCurrent() {
    setRevealed((current) => ({ ...current, [currentIndex]: true }));
  }

  function goNext() {
    if (isLast) {
      resetQuiz();
      return;
    }
    setIndex((current) => Math.min(current + 1, questions.length - 1));
  }

  function resetQuiz() {
    setIndex(0);
    setAnswers({});
    setChecked({});
    setRevealed({});
  }

  return (
    <section className="min-w-0 rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quiz {currentIndex + 1}/{questions.length}</p>
          {quiz.title ? <h3 className="mt-0.5 text-base font-semibold tracking-tight">{quiz.title}</h3> : null}
          {quiz.intro ? <p className="mt-1 max-w-prose leading-relaxed text-muted-foreground">{quiz.intro}</p> : null}
        </div>
        <Button aria-label="Quiz neu starten" size="icon-sm" type="button" variant="ghost" onClick={resetQuiz}>
          <RotateCcw />
        </Button>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div>
          {question.title ? <p className="mb-1 font-semibold">{question.title}</p> : null}
          <p className="whitespace-pre-wrap leading-relaxed">{question.prompt}</p>
        </div>

        {isChoiceQuestion ? (
          <div className="flex flex-col gap-2" role={question.type === "multiple" ? "group" : "radiogroup"}>
            {question.choices.map((choice, choiceIndex) => {
              const choiceSelected = selected.includes(choiceIndex);
              const showCorrect = (isChecked || isRevealed) && question.correct.includes(choiceIndex);
              const showWrong = isChecked && choiceSelected && !question.correct.includes(choiceIndex);
              return (
                <button
                  aria-checked={choiceSelected}
                  className={cn(
                    "grid min-h-10 w-full grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-2xl px-3 py-2 text-left transition-colors",
                    choiceSelected ? "bg-primary/10 text-foreground ring-1 ring-primary/30" : "bg-background/70 hover:bg-background",
                    showCorrect ? "bg-emerald-500/10 text-emerald-950 ring-1 ring-emerald-500/30 dark:text-emerald-100" : "",
                    showWrong ? "bg-destructive/10 text-destructive ring-1 ring-destructive/30" : "",
                  )}
                  key={`${choiceIndex}:${choice}`}
                  role={question.type === "multiple" ? "checkbox" : "radio"}
                  type="button"
                  onClick={() => toggleChoice(choiceIndex)}
                >
                  <span className="grid size-6 place-items-center rounded-full bg-secondary text-xs font-semibold">
                    {showCorrect ? <CheckCircle2 className="size-4" /> : choiceSelected ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  </span>
                  <span className="min-w-0 leading-relaxed">{choiceLetter(choiceIndex)}. {choice}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="min-h-24 w-full resize-y rounded-2xl bg-background/75 px-3 py-2 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-ring/45"
            placeholder="Deine Antwort..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        )}

        {(isChecked || isRevealed) ? (
          <div className="rounded-2xl bg-background/70 px-3 py-2">
            {isChoiceQuestion ? (
              <p className={cn("font-medium", canAutoCheck && isCorrect ? "text-emerald-700 dark:text-emerald-200" : canAutoCheck ? "text-amber-700 dark:text-amber-200" : "text-muted-foreground")}>
                {canAutoCheck ? (isCorrect ? "Richtig." : "Noch nicht ganz.") : "Auswahl gespeichert."}
              </p>
            ) : (
              <p className="font-medium text-muted-foreground">Vergleiche deine Antwort mit der Musterloesung.</p>
            )}
            {question.solution.length > 0 && (isRevealed || !isChoiceQuestion || isChecked) ? (
              <div className="mt-2 text-muted-foreground">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide">Musterloesung</p>
                <ul className="ml-5 list-disc space-y-1">
                  {question.solution.map((item, solutionIndex) => (
                    <li className="leading-relaxed" key={`${solutionIndex}:${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button disabled={!hasAnswer} size="sm" type="button" onClick={checkCurrent}>
            <CheckCircle2 />
            Pruefen
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={revealCurrent}>
            <Eye />
            Loesung
          </Button>
          <Button disabled={!hasAnswer && !isRevealed} size="sm" type="button" variant={isLast ? "secondary" : "outline"} onClick={goNext}>
            {isLast ? <RotateCcw /> : <ArrowRight />}
            {isLast ? "Neu starten" : "Weiter"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function normalizeQuizQuestion(question: QuizQuestionProps): NormalizedQuizQuestion {
  const choices = Array.isArray(question.choices)
    ? question.choices.filter((choice) => choice.trim().length > 0).slice(0, 5)
    : [];
  const type = choices.length >= 2
    ? question.type === "multiple" ? "multiple" : "single"
    : "open";
  const correct = Array.isArray(question.correct)
    ? question.correct.filter((item) => Number.isInteger(item) && item >= 0 && item < choices.length).slice(0, 5)
    : [];
  return {
    choices,
    correct: type === "single" ? correct.slice(0, 1) : correct,
    prompt: question.prompt,
    solution: Array.isArray(question.solution) ? question.solution.filter((item) => item.trim().length > 0).slice(0, 4) : [],
    title: question.title,
    type,
  };
}

function parseSelection(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
}

function sameSelection(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((item, index) => item === sortedRight[index]);
}

function choiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

class GeneratedUIBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function gapClass(gap: "xs" | "sm" | "md" | "lg" | undefined): string {
  if (gap === "xs") {
    return "gap-1.5";
  }
  if (gap === "sm") {
    return "gap-2";
  }
  if (gap === "lg") {
    return "gap-4";
  }
  return "gap-3";
}

function toneSurfaceClass(tone: "neutral" | "info" | "success" | "warning" | "danger" | undefined): string {
  if (tone === "info") {
    return "bg-sky-500/10 text-sky-950 dark:text-sky-100";
  }
  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100";
  }
  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-950 dark:text-amber-100";
  }
  if (tone === "danger") {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-secondary/70";
}

function toneTextClass(tone: "neutral" | "info" | "success" | "warning" | "danger" | undefined): string {
  if (tone === "info") {
    return "text-sky-700 dark:text-sky-200";
  }
  if (tone === "success") {
    return "text-emerald-700 dark:text-emerald-200";
  }
  if (tone === "warning") {
    return "text-amber-700 dark:text-amber-200";
  }
  if (tone === "danger") {
    return "text-destructive";
  }
  return "text-foreground";
}
