/**
 * Didaktiva V2 presentation for the lesson editor: lesson summary header and a
 * vertical activity timeline. All handlers are passed in from the route — this
 * file contains no data access, mutations or business logic.
 */
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { blockDef } from "@/lib/blocks";
import { blockIcon } from "@/lib/block-icons";
import { blockToneClass } from "@/lib/block-accent";
import type { LessonBlock } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TimelineRowV2Props {
  block: LessonBlock;
  /** Sequence number shown in the timeline gutter (1-based); null for extras. */
  position: number | null;
  /** "0–5" for planned blocks, "5m" for extras. */
  meta: string;
  draggable: boolean;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isLastRow: boolean;
  dragging: boolean;
  reorderPending: boolean;
  savePending: boolean;
  onEdit: () => void;
  onMove: (delta: number) => void;
  onDragStart: () => void;
  onDrop: () => void;
  onSaveToLibrary: () => void;
  onToggleFallback: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function TimelineRowV2(props: TimelineRowV2Props) {
  const { block: b } = props;
  const def = blockDef(b.type);
  const Icon = blockIcon(b.type);

  return (
    <div
      draggable={props.draggable}
      onDragStart={() => props.draggable && props.onDragStart()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={props.onDrop}
      className={`group/row relative flex gap-3 sm:gap-4 ${props.dragging ? "opacity-50" : ""}`}
    >
      {/* timeline gutter */}
      <div className="relative flex w-8 shrink-0 flex-col items-center pt-5 sm:w-10">
        <span className="z-10 grid size-7 place-items-center rounded-full border border-border bg-card text-xs font-semibold tabular-nums text-muted-foreground">
          {props.position !== null ? String(props.position).padStart(2, "0") : "–"}
        </span>
        {!props.isLastRow && (
          <span aria-hidden="true" className="absolute top-12 bottom-0 w-px bg-border" />
        )}
      </div>

      <div className="surface-card mb-3 flex min-w-0 flex-1 flex-wrap items-center gap-3 px-4 py-4 transition-all duration-150 hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-lift)] sm:flex-nowrap sm:gap-4 sm:px-5">
        {props.draggable ? (
          <div className="flex shrink-0 items-center gap-1">
            <GripVertical className="hidden size-4 cursor-grab text-muted-foreground/60 sm:block" />
            <div className="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-muted-foreground sm:size-7"
                aria-label={`Flyt "${b.title}" op`}
                title="Flyt op"
                disabled={props.isFirst || props.reorderPending}
                onClick={() => props.onMove(-1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-muted-foreground sm:size-7"
                aria-label={`Flyt "${b.title}" ned`}
                title="Flyt ned"
                disabled={props.isLast || props.reorderPending}
                onClick={() => props.onMove(1)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${blockToneClass(b.type)}`}
        >
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </span>

        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 text-left focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={props.onEdit}
        >
          <span className="block break-words font-medium leading-snug">{b.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{def.label}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{b.duration_minutes} min</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{props.meta}</span>
            {b.is_fallback && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                Ekstra
              </span>
            )}
          </span>
        </button>

        <div className="hidden shrink-0 items-center opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Gem "${b.title}" i bibliotek`}
            title="Gem i bibliotek"
            disabled={props.savePending}
            onClick={props.onSaveToLibrary}
          >
            <BookmarkPlus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Dublér "${b.title}"`}
            title="Dublér"
            onClick={props.onDuplicate}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`Slet "${b.title}"`}
            title="Slet"
            onClick={props.onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={`Flere handlinger for "${b.title}"`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={props.onToggleFallback}>
                {b.is_fallback ? "Gør aktiv" : "Gør til ekstra"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-11 sm:hidden"
              aria-label={`Flere handlinger for "${b.title}"`}
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={props.savePending} onSelect={props.onSaveToLibrary}>
              <BookmarkPlus className="size-4" /> Gem i bibliotek
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onToggleFallback}>
              {b.is_fallback ? "Gør aktiv" : "Gør til ekstra"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onDuplicate}>
              <Copy className="size-4" /> Dublér
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={props.onDelete}>
              <Trash2 className="size-4" /> Slet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function LessonSummaryV2({
  contextLabel,
  unitLabel,
  planned,
  target,
  over,
  activityCount,
  learningGoal,
  rescue,
  titleInput,
  statusSelect,
  primaryAction,
  secondaryActions,
}: {
  contextLabel: string;
  unitLabel?: string | null;
  planned: number;
  target: number;
  over: boolean;
  activityCount: number;
  learningGoal: string | null;
  rescue: boolean;
  titleInput: React.ReactNode;
  statusSelect: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}) {
  return (
    <div className="surface-quiet mt-6 overflow-hidden p-0">
      <div className="bg-surface/40 p-4 sm:px-7 sm:py-6">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            {(contextLabel || unitLabel) && (
              <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {[contextLabel, unitLabel].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="mt-0.5">{titleInput}</div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {planned} / {target} min planlagt
              </span>
              <span aria-hidden="true"> · </span>
              <span className="tabular-nums">
                {activityCount} {activityCount === 1 ? "aktivitet" : "aktiviteter"}
              </span>
              {over && (
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  {planned - target} min over
                </span>
              )}
            </p>
          </div>
          {primaryAction && <div className="shrink-0">{primaryAction}</div>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {statusSelect}
          {rescue && (
            <span className="rounded-full bg-accent-warm px-3 py-1 font-medium text-accent-warm-foreground">
              Nødlektion
            </span>
          )}
        </div>

        {learningGoal && (
          <p className="mt-4 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">
            <span className="mr-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
              Læringsmål
            </span>
            {learningGoal}
          </p>
        )}
      </div>

      {secondaryActions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-2.5 sm:px-7">
          {secondaryActions}
        </div>
      )}
    </div>
  );
}

