import type { ReactNode } from "react";
import { blockDef, BLOCK_TYPE_MAP } from "@/lib/blocks";
import type { LessonBlock } from "@/lib/types";

/* ---------- helpers ---------- */

function str(content: Record<string, unknown>, key: string): string {
  const v = content?.[key];
  return typeof v === "string" ? v : "";
}
function num(content: Record<string, unknown>, key: string, fallback: number): number {
  const v = content?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function list(content: Record<string, unknown>, key: string): string[] {
  const v = content?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Total reveal stages for a block (1 = everything already visible). */
export function revealSteps(block: { type: string; content: Record<string, unknown> }): number {
  const c = block.content ?? {};
  switch (block.type) {
    case "teacher_content":
    case "narrative":
      return 2;
    case "case":
      return 2;
    case "theory_test":
      return 3;
    case "compare":
      return 2;
    case "find_the_error":
      return 3;
    case "discussion":
      return list(c, "follow_up_questions").length ? 2 : 1;
    case "dilemma":
      return 3;
    case "position":
      return str(c, "follow_up_question") ? 2 : 1;
    case "poll":
    case "ranking":
    case "scale":
    case "short_response":
      return 1;
    case "exit_ticket":
      return Math.max(1, list(c, "questions").length);
    default:
      return 1;
  }
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{children}</p>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl lg:text-5xl">
      {children}
    </h2>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-4xl text-xl leading-relaxed whitespace-pre-wrap sm:text-2xl">{children}</p>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
  );
}

function Helper({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-accent/60 px-4 py-3 text-base text-accent-foreground">{children}</p>
  );
}

function Questions({ items, from = 1 }: { items: string[]; from?: number }) {
  return (
    <ol className="max-w-4xl space-y-3">
      {items.map((q, i) => (
        <li key={i} className="flex gap-4 text-xl sm:text-2xl">
          <span className="tabular-nums text-primary">{from + i}.</span>
          <span>{q}</span>
        </li>
      ))}
    </ol>
  );
}

export interface BlockRendererProps {
  block: Pick<LessonBlock, "type" | "title" | "content" | "student_instructions">;
  step: number;
  /** teacher view may show small helper hints; projector shows student-facing only */
  view: "teacher" | "projector";
  onSkip?: () => void;
}

export function BlockRenderer({ block, step, view, onSkip }: BlockRendererProps) {
  const c = (block.content ?? {}) as Record<string, unknown>;
  const known = !!BLOCK_TYPE_MAP[block.type];
  const def = blockDef(block.type);

  if (!known) {
    return (
      <div className="space-y-6">
        <Kicker>{block.type}</Kicker>
        <Title>{block.title}</Title>
        <Body>Denne aktivitetstype kan ikke vises endnu.</Body>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full bg-primary px-6 py-3 text-primary-foreground"
          >
            Spring over
          </button>
        )}
      </div>
    );
  }

  const instructions =
    block.student_instructions && step >= 1 ? (
      <p className="max-w-3xl text-lg text-muted-foreground">{block.student_instructions}</p>
    ) : null;

  const shell = (kicker: string, body: ReactNode) => (
    <div className="space-y-8">
      <Kicker>{kicker}</Kicker>
      {body}
    </div>
  );

  switch (block.type) {
    case "teacher_content":
      return shell(
        "Fagligt input",
        <>
          <Title>{block.title}</Title>
          {step >= 1 && <Body>{str(c, "body")}</Body>}
          {instructions}
        </>,
      );

    case "narrative":
      return shell(
        "Fortælling",
        <>
          <Title>{block.title}</Title>
          {step >= 1 && <Body>{str(c, "text")}</Body>}
          {instructions}
        </>,
      );

    case "case":
      return shell(
        "Case",
        <>
          <Title>{block.title}</Title>
          {step >= 0 && <Body>{str(c, "scenario")}</Body>}
          {step >= 1 ? (
            <Questions items={list(c, "questions")} />
          ) : (
            <p className="text-lg text-muted-foreground">Tryk for at vise spørgsmål</p>
          )}
          {instructions}
        </>,
      );

    case "theory_test":
      return shell(
        "Test teorien",
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Teori: {str(c, "theory") || "—"}
            </span>
            <span className="text-sm tracking-wide text-muted-foreground uppercase">
              teori → situation → vurdering → refleksion
            </span>
          </div>
          <Title>{block.title}</Title>
          {step >= 0 && (
            <Card>
              <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">Situation</p>
              <Body>{str(c, "scenario")}</Body>
            </Card>
          )}
          {step >= 1 && (
            <div className="space-y-4">
              <p className="text-2xl font-medium">{str(c, "question")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {list(c, "options").map((o, i) => (
                  <Card key={i} className="text-xl">
                    <span className="mr-3 text-primary">{String.fromCharCode(65 + i)}</span>
                    {o}
                  </Card>
                ))}
              </div>
            </div>
          )}
          {step >= 2 && (
            <div className="space-y-3">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">Refleksion</p>
              <Questions items={list(c, "follow_up_questions")} />
            </div>
          )}
          {instructions}
        </>,
      );

    case "compare":
      return shell(
        "Sammenlign",
        <>
          <Title>{block.title}</Title>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <p className="mb-2 text-sm font-semibold text-primary">A</p>
              <p className="text-xl whitespace-pre-wrap sm:text-2xl">{str(c, "item_a")}</p>
            </Card>
            <Card>
              <p className="mb-2 text-sm font-semibold text-primary">B</p>
              <p className="text-xl whitespace-pre-wrap sm:text-2xl">{str(c, "item_b")}</p>
            </Card>
          </div>
          {step >= 1 && <Questions items={list(c, "questions")} />}
          {instructions}
        </>,
      );

    case "find_the_error":
      return shell(
        "Find fejlen",
        <>
          <Title>{block.title}</Title>
          {step >= 0 && (
            <Card>
              <Body>{str(c, "material")}</Body>
            </Card>
          )}
          {step >= 1 && (
            <p className="text-2xl font-semibold text-primary">
              Find {num(c, "errors_to_find", 3)} fejl
            </p>
          )}
          {step >= 2 && str(c, "follow_up_question") && (
            <Questions items={[str(c, "follow_up_question")]} />
          )}
          {instructions}
        </>,
      );

    case "discussion":
      return shell(
        "Diskussion",
        <>
          <Title>{block.title}</Title>
          <Body>{str(c, "prompt")}</Body>
          {step >= 1 && <Questions items={list(c, "follow_up_questions")} />}
          {instructions}
        </>,
      );

    case "dilemma":
      return shell(
        "Dilemma",
        <>
          <Title>{block.title}</Title>
          {step >= 0 && <Body>{str(c, "scenario")}</Body>}
          {step >= 1 && <p className="text-2xl font-medium sm:text-3xl">{str(c, "question")}</p>}
          {step >= 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {list(c, "options").map((o, i) => (
                <Card key={i} className="text-xl">
                  {o}
                </Card>
              ))}
            </div>
          )}
          {step >= 2 && c["require_justification"] === true && (
            <p className="text-lg font-medium text-primary">Begrund jeres valg fagligt.</p>
          )}
          {instructions}
        </>,
      );

    case "position":
      return shell(
        "Tag stilling",
        <>
          <Title>{str(c, "statement") || block.title}</Title>
          <div className="max-w-4xl">
            <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-accent-warm via-secondary to-accent" />
            <div className="mt-3 flex justify-between text-lg font-medium">
              <span>{str(c, "left_label") || "Helt uenig"}</span>
              <span>{str(c, "right_label") || "Helt enig"}</span>
            </div>
          </div>
          {view === "teacher" && <Helper>Eleverne kan placere sig fysisk i lokalet.</Helper>}
          {step >= 1 && str(c, "follow_up_question") && (
            <p className="text-2xl">{str(c, "follow_up_question")}</p>
          )}
          {instructions}
        </>,
      );

    case "poll":
      return shell(
        "Afstemning",
        <>
          <Title>{str(c, "question") || block.title}</Title>
          <div className="grid gap-4 sm:grid-cols-2">
            {list(c, "options").map((o, i) => (
              <Card key={i} className="text-2xl">
                <span className="mr-3 text-primary">{String.fromCharCode(65 + i)}</span>
                {o}
              </Card>
            ))}
          </div>
          {view === "teacher" && (
            <Helper>Brug håndsoprækning, fingre eller fysisk placering.</Helper>
          )}
          {instructions}
        </>,
      );

    case "ranking":
      return shell(
        "Rangering",
        <>
          <Title>{str(c, "question") || block.title}</Title>
          <ul className="max-w-3xl space-y-3">
            {list(c, "items").map((it, i) => (
              <li
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card px-6 py-4 text-xl shadow-[var(--shadow-soft)]"
              >
                <span className="text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {it}
              </li>
            ))}
          </ul>
          {view === "teacher" && (
            <Helper>Bliv enige om en rækkefølge og begrund jeres topvalg.</Helper>
          )}
          {instructions}
        </>,
      );

    case "scale": {
      const min = num(c, "min", 1);
      const max = num(c, "max", 7);
      const steps = Array.from({ length: Math.max(2, Math.min(12, max - min + 1)) }, (_, i) => min + i);
      return shell(
        "Skala",
        <>
          <Title>{str(c, "question") || block.title}</Title>
          <div className="max-w-4xl">
            <div className="flex items-center justify-between gap-2">
              {steps.map((s) => (
                <div
                  key={s}
                  className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-lg font-medium sm:size-16 sm:text-xl"
                >
                  {s}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-lg text-muted-foreground">
              <span>{str(c, "left_label")}</span>
              <span>{str(c, "right_label")}</span>
            </div>
          </div>
          {view === "teacher" && (
            <Helper>Vis jeres vurdering med fingre eller placér jer på en fysisk linje.</Helper>
          )}
          {instructions}
        </>,
      );
    }

    case "short_response":
      return shell(
        "Kort svar",
        <>
          <Title>{str(c, "question") || block.title}</Title>
          {str(c, "placeholder") && (
            <p className="max-w-3xl rounded-2xl border border-dashed border-border px-6 py-5 text-xl text-muted-foreground">
              {str(c, "placeholder")}
            </p>
          )}
          {view === "teacher" && <Helper>Skriv individuelt i jeres noter.</Helper>}
          {instructions}
        </>,
      );

    case "exit_ticket": {
      const qs = list(c, "questions");
      const i = Math.min(step, Math.max(0, qs.length - 1));
      return shell(
        "Exit ticket",
        <>
          <p className="text-lg text-muted-foreground">
            Spørgsmål {qs.length ? i + 1 : 0} af {qs.length}
          </p>
          <Title>{qs[i] ?? block.title}</Title>
          {qs.length > 0 && i === qs.length - 1 && (
            <p className="text-lg text-muted-foreground">
              Lektionen er klar til at blive afsluttet.
            </p>
          )}
          {instructions}
        </>,
      );
    }

    default:
      return shell(def.label, <Title>{block.title}</Title>);
  }
}
