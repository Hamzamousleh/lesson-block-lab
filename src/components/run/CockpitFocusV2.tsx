/**
 * Didaktiva V2 presentation: "NU" focus card for the teacher cockpit.
 * Pure presentation — all state, sync and timers stay in the run route.
 */
import { ArrowRight } from "lucide-react";
import { blockIcon } from "@/lib/block-icons";
import { Button } from "@/components/ui/button";

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
  nextTitle,
  nextTypeLabel,
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
  nextTitle: string | null;
  nextTypeLabel: string | null;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  const Icon = blockIcon(type);
  const pct = participants && participants > 0 ? Math.round(((answered ?? 0) / participants) * 100) : null;

  return (
    <section className="surface-card overflow-hidden p-0">
      <div className="flex flex-wrap items-start gap-4 border-b border-border/70 bg-accent/40 p-5 sm:p-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-card text-primary shadow-[var(--shadow-soft)]">
          <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            NU · aktivitet {index + 1} af {total}
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {typeLabel} · {workModeLabel} · {durationMinutes} min
          </p>
        </div>
        {participants !== null && (
          <div className="shrink-0 text-right">
            <p className="text-sm tabular-nums text-muted-foreground">
              {answered ?? 0} / {participants} har svaret
            </p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:px-6">
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">NÆSTE:</span>{" "}
          {nextTitle ? `${nextTitle}${nextTypeLabel ? ` · ${nextTypeLabel}` : ""}` : "Afslutning"}
        </p>
        <Button size="sm" className="shrink-0 rounded-full" onClick={onNext} disabled={nextDisabled}>
          Næste <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
