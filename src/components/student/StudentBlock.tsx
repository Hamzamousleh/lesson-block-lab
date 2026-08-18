import { useEffect, useRef, useState } from "react";
import { Loader2, Check, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ResultSummary } from "@/lib/results";
import { ResourceList } from "@/components/ResourcePreview";
import { readResources } from "@/lib/resources";

export interface StudentBlockData {
  id: string;
  type: string;
  title: string;
  student_instructions: string | null;
  content: Record<string, unknown>;
  interactive: boolean;
}

function str(c: Record<string, unknown>, k: string): string {
  const v = c?.[k];
  return typeof v === "string" ? v : "";
}
function num(c: Record<string, unknown>, k: string, f: number): number {
  const v = c?.[k];
  return typeof v === "number" && Number.isFinite(v) ? v : f;
}
function arr(c: Record<string, unknown>, k: string): string[] {
  const v = c?.[k];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">{label}</p>
      {children}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-lg leading-relaxed whitespace-pre-wrap sm:text-xl">{children}</p>;
}

function OptionButton({
  label,
  index,
  selected,
  disabled,
  state,
  onSelect,
}: {
  label: string;
  index: number;
  selected: boolean;
  disabled: boolean;
  state?: "correct" | "wrong" | null;
  onSelect: () => void;
}) {
  const tone =
    state === "correct"
      ? "border-primary bg-primary/15 text-foreground"
      : state === "wrong"
        ? "border-destructive/60 bg-destructive/10 text-foreground"
        : selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card hover:border-primary/50";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left text-lg transition-colors ${tone} ${
        disabled ? "opacity-90" : ""
      }`}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
        {String.fromCharCode(65 + index)}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {state === "correct" && (
        <span className="shrink-0 text-sm font-medium text-primary">Korrekt</span>
      )}
      {state === "wrong" && (
        <span className="shrink-0 text-sm font-medium text-destructive">Dit svar</span>
      )}
    </button>
  );
}

export function ResultBars({ summary }: { summary: ResultSummary }) {
  if (summary.kind === "options") {
    return (
      <div className="space-y-2">
        {summary.labels.map((label, i) => {
          const count = summary.counts[i] ?? 0;
          const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="min-w-0 truncate pr-3">
                  {String.fromCharCode(65 + i)}. {label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (summary.kind === "scale") {
    const maxCount = Math.max(1, ...summary.counts);
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {summary.total} svar · gennemsnit{" "}
          <span className="font-medium text-foreground">{summary.average}</span>
        </p>
        <div className="space-y-1">
          {summary.counts.map((count, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-6 shrink-0 tabular-nums text-muted-foreground">
                {summary.min + i}
              </span>
              <div className="h-2.5 flex-1 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (summary.kind === "text") {
    return (
      <div className="space-y-3">
        {summary.items.map((it, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            {it.name && <p className="text-xs text-muted-foreground">{it.name}</p>}
            <p className="mt-1 whitespace-pre-wrap">{it.text}</p>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground">{summary.total} svar registreret.</p>;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface StudentAnswerKey {
  correct_option_index: number;
  my_correct: boolean | null;
  message: string | null;
}

export interface StudentBlockProps {
  block: StudentBlockData;
  saved: Record<string, unknown> | undefined;
  submitting: boolean;
  disabled: boolean;
  /** explicit save lifecycle for the submit button */
  saveState?: SaveState;
  feedback?: { correct: boolean; message: string } | null;
  revealed?: ResultSummary | null;
  /** only present after the teacher pressed "Vis facit" */
  answerKey?: StudentAnswerKey | null;
  /** read-only teacher preview: renders exactly what students see, no submitting */
  preview?: boolean;
  onSubmit?: (data: Record<string, unknown>) => void;
}

/** shallow compare of the fields we are about to submit against what is stored */
function samePayload(
  data: Record<string, unknown>,
  saved: Record<string, unknown> | undefined,
): boolean {
  if (!saved) return false;
  return Object.keys(data).every((k) => JSON.stringify(data[k]) === JSON.stringify(saved[k]));
}

export function StudentBlock({
  block,
  saved,
  submitting,
  disabled,
  saveState = "idle",
  feedback,
  revealed,
  answerKey,
  preview = false,
  onSubmit,
}: StudentBlockProps) {
  const c = block.content ?? {};
  const [option, setOption] = useState<number | null>(
    typeof saved?.["selected_option_index"] === "number"
      ? (saved["selected_option_index"] as number)
      : null,
  );
  const [text, setText] = useState<string>(
    typeof saved?.["text"] === "string" ? (saved["text"] as string) : "",
  );
  const [justification, setJustification] = useState<string>(
    typeof saved?.["justification"] === "string" ? (saved["justification"] as string) : "",
  );
  const [value, setValue] = useState<number>(
    typeof saved?.["value"] === "number" ? (saved["value"] as number) : num(c, "min", 1),
  );
  const [answers, setAnswers] = useState<string[]>(
    Array.isArray(saved?.["answers"]) ? (saved["answers"] as string[]) : [],
  );
  const [order, setOrder] = useState<string[]>(
    Array.isArray(saved?.["ordered_items"])
      ? (saved["ordered_items"] as string[])
      : arr(c, "items"),
  );

  /*
   * Local answer state is ONLY (re)seeded when the activity itself changes.
   * Background polling of the session must never overwrite what the student
   * is currently typing, reset scroll or steal focus.
   */
  useEffect(() => {
    setOption(
      typeof saved?.["selected_option_index"] === "number"
        ? (saved["selected_option_index"] as number)
        : null,
    );
    setText(typeof saved?.["text"] === "string" ? (saved["text"] as string) : "");
    setJustification(
      typeof saved?.["justification"] === "string" ? (saved["justification"] as string) : "",
    );
    setValue(typeof saved?.["value"] === "number" ? (saved["value"] as number) : num(c, "min", 1));
    setAnswers(Array.isArray(saved?.["answers"]) ? (saved["answers"] as string[]) : []);
    setOrder(
      Array.isArray(saved?.["ordered_items"])
        ? (saved["ordered_items"] as string[])
        : arr(c, "items"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const wasUpdate = useRef(false);

  const answered = !!saved;
  const lock = disabled || preview;

  const optionState = (i: number): "correct" | "wrong" | null => {
    if (!answerKey) return null;
    if (i === answerKey.correct_option_index) return "correct";
    if (option === i && answerKey.my_correct === false) return "wrong";
    return null;
  };

  const submitBar = (payload: () => Record<string, unknown> | null, label = "Indsend svar") => {
    if (preview) return null;
    const data = payload();
    const dirty = !answered || !data || !samePayload(data, saved);

    let buttonLabel = label;
    if (saveState === "saving") buttonLabel = "Gemmer…";
    else if (saveState === "error") buttonLabel = "Kunne ikke gemme — prøv igen";
    else if (answered && dirty) buttonLabel = "Gem ændringer";
    else if (answered && !dirty)
      buttonLabel = wasUpdate.current ? "✓ Ændringer gemt" : "✓ Svar gemt";

    const restingSaved = answered && !dirty && saveState !== "saving" && saveState !== "error";

    return (
      <div className="space-y-3 pt-2">
        <Button
          size="lg"
          variant={saveState === "error" ? "destructive" : restingSaved ? "outline" : "default"}
          className="h-14 w-full rounded-2xl text-base"
          disabled={submitting || lock || saveState === "saving" || restingSaved}
          onClick={() => {
            if (!data || !onSubmit) return;
            wasUpdate.current = answered;
            onSubmit(data);
          }}
        >
          {saveState === "saving" && <Loader2 className="size-4 animate-spin" />}
          {buttonLabel}
        </Button>
        {restingSaved && (
          <p className="flex items-center justify-center gap-2 text-sm text-primary">
            <Check className="size-4" /> Dit svar er registreret
          </p>
        )}
        {saveState === "error" && (
          <p className="text-center text-sm text-destructive">
            Dit svar er stadig her — tryk igen når du har forbindelse.
          </p>
        )}
        {answerKey && (
          <div
            className={`rounded-2xl p-4 text-base ${
              answerKey.my_correct
                ? "bg-primary/10 text-foreground"
                : "bg-accent-warm text-accent-warm-foreground"
            }`}
          >
            <p className="font-medium">
              {answerKey.my_correct === null
                ? "Facit er vist"
                : answerKey.my_correct
                  ? "Korrekt ✓"
                  : "Ikke helt"}
            </p>
            <p className="mt-1">
              {answerKey.message ??
                `Det rigtige svar er ${String.fromCharCode(65 + answerKey.correct_option_index)}.`}
            </p>
          </div>
        )}
        {feedback && (
          <div
            className={`rounded-2xl p-4 text-base ${
              feedback.correct
                ? "bg-primary/10 text-foreground"
                : "bg-accent-warm text-accent-warm-foreground"
            }`}
          >
            <p className="font-medium">{feedback.correct ? "Korrekt ✓" : "Ikke helt"}</p>
            <p className="mt-1">{feedback.message}</p>
          </div>
        )}
        {revealed && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Klassens svar</p>
            <ResultBars summary={revealed} />
          </div>
        )}
      </div>
    );
  };

  const header = (kicker: string) => (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">{kicker}</p>
      <h1 className="font-display text-2xl leading-tight font-semibold text-balance sm:text-3xl">
        {block.title}
      </h1>
      {block.student_instructions && (
        <p className="rounded-xl bg-accent/60 px-4 py-3 text-base text-accent-foreground">
          {block.student_instructions}
        </p>
      )}
      <ResourceList resources={readResources(block.content)} className="pt-1" />
    </div>
  );

  const options = arr(c, "options");

  switch (block.type) {
    /* ---------- readable ---------- */
    case "teacher_content":
      return (
        <div className="space-y-6">
          {header("Fagligt input")}
          <Prose>{str(c, "body")}</Prose>
        </div>
      );
    case "narrative":
      return (
        <div className="space-y-6">
          {header("Fortælling")}
          <Prose>{str(c, "text")}</Prose>
        </div>
      );
    case "discussion":
      return (
        <div className="space-y-6">
          {header("Diskussion")}
          <Prose>{str(c, "prompt")}</Prose>
          {arr(c, "follow_up_questions").length > 0 && (
            <ul className="space-y-2 text-lg">
              {arr(c, "follow_up_questions").map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          )}
          <p className="rounded-xl bg-secondary px-4 py-3 text-base">
            Tal med en makker eller skriv noter til dig selv.
          </p>
        </div>
      );

    /* ---------- option based ---------- */
    case "poll":
      return (
        <div className="space-y-6">
          {header("Afstemning")}
          <Prose>{str(c, "question")}</Prose>
          <div className="space-y-3">
            {options.map((o, i) => (
              <OptionButton
                key={i}
                label={o}
                index={i}
                selected={option === i}
                disabled={lock}
                onSelect={() => setOption(i)}
              />
            ))}
          </div>
          {submitBar(() => (option === null ? null : { selected_option_index: option }))}
        </div>
      );

    case "theory_test":
      return (
        <div className="space-y-6">
          {header("Test teorien")}
          {str(c, "theory") && (
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Teori: {str(c, "theory")}
            </span>
          )}
          {str(c, "scenario") && (
            <Section label="Situation">
              <Prose>{str(c, "scenario")}</Prose>
            </Section>
          )}
          <Prose>{str(c, "question")}</Prose>
          <div className="space-y-3">
            {options.map((o, i) => (
              <OptionButton
                key={i}
                label={o}
                index={i}
                selected={option === i}
                disabled={lock || !!answerKey}
                state={optionState(i)}
                onSelect={() => setOption(i)}
              />
            ))}
          </div>
          {submitBar(() => (option === null ? null : { selected_option_index: option }))}
        </div>
      );

    case "dilemma": {
      const requireJust = c["require_justification"] === true;
      return (
        <div className="space-y-6">
          {header("Dilemma")}
          <Prose>{str(c, "scenario")}</Prose>
          <Prose>{str(c, "question")}</Prose>
          <div className="space-y-3">
            {options.map((o, i) => (
              <OptionButton
                key={i}
                label={o}
                index={i}
                selected={option === i}
                disabled={lock}
                onSelect={() => setOption(i)}
              />
            ))}
          </div>
          {requireJust && (
            <div className="space-y-2">
              <label className="text-base font-medium" htmlFor={`${block.id}-justification`}>
                Begrund dit valg
              </label>
              <Textarea
                id={`${block.id}-justification`}
                value={justification}
                disabled={lock}
                onChange={(e) => setJustification(e.target.value)}
                className="min-h-32 rounded-2xl text-base"
              />
            </div>
          )}
          {submitBar(() =>
            option === null
              ? null
              : { selected_option_index: option, justification: requireJust ? justification : "" },
          )}
        </div>
      );
    }

    /* ---------- numeric ---------- */
    case "scale": {
      const min = num(c, "min", 1);
      const max = num(c, "max", 7);
      return (
        <div className="space-y-6">
          {header("Skala")}
          <Prose>{str(c, "question")}</Prose>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={value === v}
                  disabled={lock}
                  onClick={() => setValue(v)}
                  className={`h-14 min-w-14 flex-1 rounded-2xl border text-lg font-medium transition-colors ${
                    value === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{str(c, "left_label")}</span>
              <span>{str(c, "right_label")}</span>
            </div>
          </div>
          {submitBar(() => ({ value }))}
        </div>
      );
    }

    case "position": {
      return (
        <div className="space-y-6">
          {header("Tag stilling")}
          <Prose>{str(c, "statement")}</Prose>
          <div className="space-y-4">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={value}
              disabled={lock}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-3 w-full accent-[var(--primary)]"
              aria-label="Din placering"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{str(c, "left_label") || "Helt uenig"}</span>
              <span className="font-medium text-foreground">{value}</span>
              <span>{str(c, "right_label") || "Helt enig"}</span>
            </div>
          </div>
          {str(c, "follow_up_question") && (
            <div className="space-y-2">
              <label className="text-base font-medium" htmlFor={`${block.id}-follow-up`}>
                {str(c, "follow_up_question")}
              </label>
              <Textarea
                id={`${block.id}-follow-up`}
                value={justification}
                disabled={lock}
                onChange={(e) => setJustification(e.target.value)}
                className="min-h-28 rounded-2xl text-base"
              />
            </div>
          )}
          {submitBar(() => ({ value, justification }))}
        </div>
      );
    }

    /* ---------- text ---------- */
    case "short_response":
      return (
        <div className="space-y-6">
          {header("Kort svar")}
          <Prose>{str(c, "question")}</Prose>
          <Textarea
            aria-label="Dit korte svar"
            value={text}
            disabled={lock}
            placeholder={str(c, "placeholder")}
            onChange={(e) => setText(e.target.value)}
            className="min-h-40 rounded-2xl text-base"
          />
          {submitBar(() => (text.trim() ? { text } : null))}
        </div>
      );

    case "find_the_error":
      return (
        <div className="space-y-6">
          {header("Find fejlen")}
          <Prose>{str(c, "material")}</Prose>
          <div className="space-y-2">
            <label className="text-base font-medium" htmlFor={`${block.id}-errors`}>
              Hvilke fejl finder du?
            </label>
            <Textarea
              id={`${block.id}-errors`}
              value={text}
              disabled={lock}
              onChange={(e) => setText(e.target.value)}
              className="min-h-40 rounded-2xl text-base"
            />
          </div>
          {str(c, "follow_up_question") && (
            <div className="space-y-2">
              <label className="text-base font-medium" htmlFor={`${block.id}-error-follow-up`}>
                {str(c, "follow_up_question")}
              </label>
              <Textarea
                id={`${block.id}-error-follow-up`}
                value={justification}
                disabled={lock}
                onChange={(e) => setJustification(e.target.value)}
                className="min-h-28 rounded-2xl text-base"
              />
            </div>
          )}
          {submitBar(() => (text.trim() ? { text, justification } : null))}
        </div>
      );

    case "case":
    case "compare":
    case "exit_ticket": {
      const questions = arr(c, "questions");
      const kicker =
        block.type === "case" ? "Case" : block.type === "compare" ? "Sammenlign" : "Exit ticket";
      return (
        <div className="space-y-6">
          {header(kicker)}
          {block.type === "case" && <Prose>{str(c, "scenario")}</Prose>}
          {block.type === "compare" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase">A</p>
                <p className="mt-1 text-lg">{str(c, "item_a")}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase">B</p>
                <p className="mt-1 text-lg">{str(c, "item_b")}</p>
              </div>
            </div>
          )}
          <div className="space-y-5">
            {questions.map((q, i) => (
              <div key={i} className="space-y-2">
                <label className="text-base font-medium" htmlFor={`${block.id}-answer-${i}`}>
                  {i + 1}. {q}
                </label>
                <Textarea
                  id={`${block.id}-answer-${i}`}
                  value={answers[i] ?? ""}
                  disabled={lock}
                  onChange={(e) => {
                    const next = [...answers];
                    while (next.length < questions.length) next.push("");
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  className="min-h-28 rounded-2xl text-base"
                />
              </div>
            ))}
          </div>
          {submitBar(() => {
            const filled = questions.map((_, i) => answers[i] ?? "");
            return filled.some((a) => a.trim()) ? { answers: filled } : null;
          })}
        </div>
      );
    }

    case "ranking":
      return (
        <div className="space-y-6">
          {header("Rangering")}
          <Prose>{str(c, "question")}</Prose>
          <ol className="space-y-2">
            {order.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 text-base">{item}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label="Flyt op"
                  disabled={i === 0 || lock}
                  onClick={() => {
                    const next = [...order];
                    const prev = next[i - 1] as string;
                    next[i - 1] = next[i] as string;
                    next[i] = prev;
                    setOrder(next);
                  }}
                >
                  <ArrowUp className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label="Flyt ned"
                  disabled={i === order.length - 1 || lock}
                  onClick={() => {
                    const next = [...order];
                    const after = next[i + 1] as string;
                    next[i + 1] = next[i] as string;
                    next[i] = after;
                    setOrder(next);
                  }}
                >
                  <ArrowDown className="size-5" />
                </Button>
              </li>
            ))}
          </ol>
          {submitBar(() => ({ ordered_items: order }))}
        </div>
      );

    default:
      return (
        <div className="space-y-6">
          {header("Aktivitet")}
          <p className="text-muted-foreground">Følg med på klassens skærm.</p>
        </div>
      );
  }
}
