/**
 * Didaktiva V2 presentation: "NU" focus card, live header and session timeline
 * for the teacher cockpit. Pure presentation — all state, sync and timers stay
 * in the run route.
 */
import { ArrowRight, Check } from "lucide-react";
import { blockIcon } from "@/lib/block-icons";
import { blockToneClass } from "@/lib/block-accent";
import { Button } from "@/components/ui/button";

export function CockpitLiveHeaderV2({
  title,
  index,
  total,
  className: klassName,
  joinCode,
  participants,
}: {
  title: string;
  index: number;
  total: number;
  className: string | null;
  joinCode: string | null;
  participants: number | null;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        Live
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          Aktivitet {index + 1} af {total}
          {klassName ? ` · ${klassName}` : ""}
          {joinCode ? ` · Kode ${joinCode}` : ""}
          {participants !== null ? ` · ${participants} deltagere` : ""}
        </p>
      </div>
    </div>
  );
}

export function CockpitFocusV2({
  index,
  total,
  title,
  type,
  typeLabel,
  workModeLabel,
  durationMinutes,
  answered,
  participants,
  studentInstructions,
  nextTitle,
  nextTypeLabel,
  nextDurationMinutes,
  onNext,
  nextDisabled,
}: {
  index: number;
  total: number;
  title: string;
  type: string;
  typeLabel: string;
  workModeLabel: string;
  durationMinutes: number;
  answered: number | null;
  participants: number | null;
  studentInstructions?: string | null;
  nextTitle: string | null;
  nextTypeLabel: string | null;
  nextDurationMinutes?: number | null;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  const Icon = blockIcon(type);
  const pct =
    participants && participants > 0 ? Math.round(((answered ?? 0) / participants) * 100) : null;

  return (
    <section className="surface-card overflow-hidden p-0">
      <div className="flex flex-wrap items-start gap-4 bg-surface/70 p-5 sm:p-6">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl ${blockToneClass(type)}`}
        >
          <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
            Nu · {index + 1} af {total}
          </p>
          <h2 className="mt-1 text-xl leading-snug font-semibold break-words sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {typeLabel} · {workModeLabel} · {durationMinutes} min
          </p>
        </div>
      </div>

      {studentInstructions && (
        <p className="border-t border-border/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
          {studentInstructions}
        </p>
      )}

      {participants !== null && (
        <div className="border-t border-border/60 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Elever
            </p>
            <p className="text-sm tabular-nums">
              {answered ?? 0} af {participants} har svaret
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border/60 p-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Næste
          </p>
          <p className="mt-0.5 truncate text-sm">
            {nextTitle
              ? `${nextTitle}${nextTypeLabel ? ` · ${nextTypeLabel}` : ""}${
                  nextDurationMinutes ? ` · ${nextDurationMinutes} min` : ""
                }`
              : "Afslutning"}
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0 rounded-full px-5"
          onClick={onNext}
          disabled={nextDisabled}
        >
          Næste <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}

/**
 * Warm, non-terminal timer typography: large time, quiet qualifier below.
 * Pure presentation — the seconds value and all timer logic stay in the route.
 */
export function CockpitTimerV2({ seconds }: { seconds: number }) {
  const overtime = seconds <= -1;
  const abs = Math.max(0, Math.round(Math.abs(seconds)));
  const time = `${overtime ? "+" : ""}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(
    abs % 60,
  ).padStart(2, "0")}`;
  const qualifier = overtime ? "over tid" : seconds > 0 ? "tilbage" : "tiden er gået";

  return (
    <p className={overtime ? "text-destructive" : ""}>
      <span className="block font-display text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
        {time}
      </span>
      <span className="mt-1.5 block text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {qualifier}
      </span>
    </p>
  );
}

export function CockpitTimelineItemV2({

  title,
  durationMinutes,
  state,
}: {
  title: string;
  durationMinutes: number;
  state: "done" | "current" | "upcoming" | "skipped";
}) {
  return (
    <span className="flex w-full items-center gap-2.5">
      <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
        {state === "done" ? (
          <Check className="size-3.5 text-primary" />
        ) : state === "current" ? (
          <span className="size-2.5 rounded-full bg-primary" />
        ) : state === "skipped" ? (
          <span className="h-px w-2.5 bg-muted-foreground" />
        ) : (
          <span className="size-2.5 rounded-full border border-muted-foreground/50" />
        )}
      </span>
      <span
        className={`min-w-0 flex-1 truncate ${
          state === "current"
            ? "font-semibold text-foreground"
            : state === "done"
              ? "text-muted-foreground"
              : state === "skipped"
                ? "text-muted-foreground line-through"
                : "text-foreground/75"
        }`}
      >
        {title}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {durationMinutes} min
      </span>

    </span>
  );
}
