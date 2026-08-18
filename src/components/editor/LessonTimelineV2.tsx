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
      className={`relative flex gap-3 sm:gap-4 ${props.dragging ? "opacity-50" : ""}`}
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

      <div className="surface-card mb-3 flex min-w-0 flex-1 flex-wrap items-center gap-3 px-4 py-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:flex-nowrap sm:gap-4 sm:px-5">
        {props.draggable ? (
          <div className="flex shrink-0 items-center gap-1">
            <GripVertical className="hidden size-4 cursor-grab text-muted-foreground sm:block" />
            <div className="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 sm:size-8"
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
                className="size-10 sm:size-8"
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

        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.9} />
        </span>

        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 text-left focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={props.onEdit}
        >
          <span className="block break-words font-medium">{b.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              {def.label}
            </span>
            <span className="tabular-nums">{b.duration_minutes} min</span>
            <span className="tabular-nums">· {props.meta}</span>
          </span>
        </button>

        <div className="hidden shrink-0 items-center sm:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Gem "${b.title}" i bibliotek`}
            disabled={props.savePending}
            onClick={props.onSaveToLibrary}
          >
            <BookmarkPlus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs"
            onClick={props.onToggleFallback}
          >
            {b.is_fallback ? "Gør aktiv" : "Gør til ekstra"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Dublér "${b.title}"`}
            onClick={props.onDuplicate}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Slet "${b.title}"`}
            onClick={props.onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
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
  planned,
  target,
  over,
  activityCount,
  learningGoal,
  rescue,
  titleInput,
  statusSelect,
}: {
  contextLabel: string;
  planned: number;
  target: number;
  over: boolean;
  activityCount: number;
  learningGoal: string | null;
  rescue: boolean;
  titleInput: React.ReactNode;
  statusSelect: React.ReactNode;
}) {
  return (
    <div className="surface-card mt-6 p-4 sm:p-8">
      {contextLabel && (
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {contextLabel}
        </p>
      )}
      <div className="mt-2">{titleInput}</div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`rounded-full px-3 py-1 font-medium tabular-nums ${
            over
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {planned} / {target} min planlagt
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 font-medium tabular-nums text-secondary-foreground">
          {activityCount} {activityCount === 1 ? "aktivitet" : "aktiviteter"}
        </span>
        {rescue && (
          <span className="rounded-full bg-accent-warm px-3 py-1 font-medium text-accent-warm-foreground">
            Nødlektion
          </span>
        )}
        {statusSelect}
      </div>

      {learningGoal && (
        <div className="mt-5 rounded-2xl bg-secondary/50 p-4">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Læringsmål
          </p>
          <p className="mt-1 text-sm leading-relaxed">{learningGoal}</p>
        </div>
      )}
    </div>
  );
}
