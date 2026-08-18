import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Radio, UserRound } from "lucide-react";
import { createSession, type SessionMode } from "@/lib/sessions";
import { readiness, isInteractive } from "@/lib/results";
import type { LessonBlock } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StartSessionDialog({
  open,
  onOpenChange,
  lessonId,
  classId,
  blocks,
  episodeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lessonId: string;
  classId: string | null;
  blocks: LessonBlock[];
  /** Set when the session is launched from a World episode. */
  episodeId?: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<SessionMode | null>(null);
  const variantLevels = Array.from(
    new Set(
      blocks
        .filter((b) => b.variant_group && b.variant_label)
        .map((b) => b.variant_label as string),
    ),
  );
  const [variant, setVariant] = useState<string | null>(variantLevels[0] ?? null);
  const r = readiness(blocks);

  const create = useMutation({
    mutationFn: (m: SessionMode) =>
      createSession({
        lesson_id: lessonId,
        class_id: classId,
        mode: m,
        variant_label: variantLevels.length ? variant : null,
        episode_id: episodeId ?? null,
      }),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onOpenChange(false);
      toast.success("Elevsessionen er oprettet ✓");
      navigate({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Hvordan skal eleverne arbejde?
          </DialogTitle>
          <DialogDescription>Du kan altid afslutte sessionen igen.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <button
            type="button"
            aria-pressed={mode === "live"}
            onClick={() => setMode("live")}
            className={`flex w-full gap-4 rounded-2xl border p-5 text-left transition-colors ${
              mode === "live"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Radio className="mt-1 size-5 shrink-0 text-primary" />
            <span>
              <span className="block font-medium">Live</span>
              <span className="block text-sm text-muted-foreground">
                Du styrer aktiviteten, og eleverne svarer undervejs.
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-pressed={mode === "self_paced"}
            onClick={() => setMode("self_paced")}
            className={`flex w-full gap-4 rounded-2xl border p-5 text-left transition-colors ${
              mode === "self_paced"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <UserRound className="mt-1 size-5 shrink-0 text-primary" />
            <span>
              <span className="block font-medium">Selvstændig</span>
              <span className="block text-sm text-muted-foreground">
                Eleverne arbejder gennem lektionen i eget tempo.
              </span>
            </span>
          </button>
        </div>

        {variantLevels.length > 0 && (
          <div className="rounded-2xl bg-secondary p-5">
            <p className="text-sm font-medium">Lektionen har niveaudelte varianter</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vælg hvilken variant eleverne møder. Niveauet vises ikke for eleverne.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {variantLevels.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={variant === l}
                  onClick={() => setVariant(l)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors ${
                    variant === l
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "self_paced" && (
          <div className="rounded-2xl bg-secondary p-5 text-sm">
            <p className="font-medium">Denne lektion indeholder:</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>{r.total} aktiviteter</li>
              <li>{r.digital} kan besvares digitalt</li>
              <li>{r.teacherLed} er primært beregnet til fælles undervisning</li>
            </ul>
            {r.teacherLedTitles.length > 0 && (
              <ul className="mt-3 space-y-1">
                {r.teacherLedTitles.map((t, i) => (
                  <li key={i} className="truncate">
                    · {t}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-muted-foreground">
              Du kan sagtens fortsætte — eleverne kan læse dem alligevel.
            </p>
          </div>
        )}

        <Button
          size="lg"
          className="h-12 w-full rounded-full"
          disabled={!mode || create.isPending}
          onClick={() => mode && create.mutate(mode)}
        >
          {create.isPending && <Loader2 className="size-4 animate-spin" />} Opret session
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ReadinessBadge({ blocks }: { blocks: LessonBlock[] }) {
  const usable = blocks.filter((b) => isInteractive(b.type)).length;
  if (blocks.length === 0) return null;
  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
      Elevklar: {usable} / {blocks.length} aktiviteter kan bruges selvstændigt
    </span>
  );
}
