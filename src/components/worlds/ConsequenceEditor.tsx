import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { blocksQuery } from "@/lib/data";
import { isInteractive } from "@/lib/results";
import { describeChange, previewChanges } from "@/lib/consequences";
import {
  createConsequence,
  deleteConsequence,
  REVEAL_LABEL,
  TRIGGER_LABEL,
  updateConsequence,
  type RevealTiming,
  type StateChange,
  type StateOperation,
  type TriggerType,
  type WorldConsequence,
  type WorldEpisode,
  type WorldStateVar,
} from "@/lib/worlds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TRIGGERS: TriggerType[] = [
  "manual",
  "majority_choice",
  "threshold",
  "response_distribution",
];
const REVEALS: RevealTiming[] = ["immediate", "end_of_block", "end_of_episode", "next_episode"];
const OPERATIONS: { key: StateOperation; label: string }[] = [
  { key: "increase", label: "Forøg med" },
  { key: "decrease", label: "Sænk med" },
  { key: "set", label: "Sæt til" },
  { key: "enum_change", label: "Skift til" },
  { key: "boolean_toggle", label: "Slå til/fra" },
];

interface Draft {
  title: string;
  source_block_id: string | null;
  trigger_type: TriggerType;
  option_index: number;
  min_share: number;
  comparator: "lt" | "lte" | "gt" | "gte" | "eq";
  value: number;
  reveal_timing: RevealTiming;
  changes: StateChange[];
  teacher_explanation: string;
  student_explanation: string;
  academic_rationale: string;
}

function toDraft(c: WorldConsequence | null, states: WorldStateVar[]): Draft {
  const cfg = c?.trigger_config ?? {};
  return {
    title: c?.title ?? "",
    source_block_id: c?.source_block_id ?? null,
    trigger_type: (c?.trigger_type ?? "manual") as TriggerType,
    option_index: Number(cfg["option_index"] ?? 0),
    min_share: Number(cfg["min_share"] ?? 50),
    comparator: (cfg["comparator"] as Draft["comparator"]) ?? "gte",
    value: Number(cfg["value"] ?? 3),
    reveal_timing: (c?.reveal_timing ?? "immediate") as RevealTiming,
    changes:
      (c?.consequence_config?.["changes"] as StateChange[] | undefined) ??
      (states[0]
        ? [{ state_key: states[0].state_key, operation: "decrease", value: 5 } as StateChange]
        : []),
    teacher_explanation: c?.teacher_explanation ?? "",
    student_explanation: c?.student_explanation ?? "",
    academic_rationale: c?.academic_rationale ?? "",
  };
}

export function ConsequenceEditor({
  open,
  onOpenChange,
  worldId,
  episode,
  states,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  worldId: string;
  episode: WorldEpisode;
  states: WorldStateVar[];
  editing: WorldConsequence | null;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [d, setD] = useState<Draft>(() => toDraft(editing, states));
  const blocks = useQuery({
    ...blocksQuery(episode.lesson_id ?? ""),
    enabled: !!episode.lesson_id && open,
  });
  const interactive = (blocks.data ?? []).filter((b) => isInteractive(b.type));

  const preview = useMemo(() => previewChanges(states, d.changes), [states, d.changes]);
  const needsBlock = d.trigger_type !== "manual";

  function patch(p: Partial<Draft>) {
    setD((prev) => ({ ...prev, ...p }));
  }
  function patchChange(i: number, p: Partial<StateChange>) {
    setD((prev) => ({
      ...prev,
      changes: prev.changes.map((c, idx) => (idx === i ? ({ ...c, ...p } as StateChange) : c)),
    }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!d.title.trim()) throw new Error("Giv konsekvensen en titel.");
      if (!d.changes.length) throw new Error("Tilføj mindst én ændring i World-tilstanden.");
      if (needsBlock && !d.source_block_id)
        throw new Error("Vælg den aktivitet, elevernes svar skal aflæses fra.");
      if (preview.errors.length) throw new Error(preview.errors[0]!);

      const trigger_config: Record<string, unknown> =
        d.trigger_type === "majority_choice"
          ? { option_index: d.option_index }
          : d.trigger_type === "response_distribution"
            ? { option_index: d.option_index, min_share: d.min_share }
            : d.trigger_type === "threshold"
              ? { comparator: d.comparator, value: d.value }
              : {};

      const payload = {
        title: d.title.trim(),
        source_block_id: needsBlock ? d.source_block_id : null,
        trigger_type: d.trigger_type,
        trigger_config,
        reveal_timing: d.reveal_timing,
        teacher_explanation: d.teacher_explanation || null,
        student_explanation: d.student_explanation || null,
        academic_rationale: d.academic_rationale || null,
      };

      if (editing) {
        return updateConsequence(editing.id, {
          ...payload,
          consequence_config: { changes: d.changes },
        });
      }
      return createConsequence({
        world_id: worldId,
        episode_id: episode.id,
        changes: d.changes,
        ...payload,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["world-consequences", worldId] });
      toast.success("Konsekvensen er gemt.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await deleteConsequence(editing.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["world-consequences", worldId] });
      toast.success("Konsekvensen er slettet.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Redigér konsekvens" : "Tilføj konsekvens"}</DialogTitle>
          <DialogDescription>
            Konsekvensen ændrer først World-tilstanden, når du bekræfter den.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label htmlFor="c-title">Titel</Label>
            <Input
              id="c-title"
              className="mt-2"
              value={d.title}
              placeholder="Fx: Klassen valgte at skære i budgettet"
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>

          <div>
            <Label>Udløses af</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRIGGERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch({ trigger_type: t })}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    d.trigger_type === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {TRIGGER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {needsBlock && (
            <div>
              <Label>Aktivitet med elevsvar</Label>
              {!episode.lesson_id ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Episoden har ingen lektion endnu. Vælg "Læreren beslutter", eller importér en
                  lektion til episoden først.
                </p>
              ) : interactive.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Lektionen har ingen aktiviteter, eleverne kan svare på.
                </p>
              ) : (
                <select
                  className="mt-2 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
                  value={d.source_block_id ?? ""}
                  onChange={(e) => patch({ source_block_id: e.target.value || null })}
                >
                  <option value="">Vælg aktivitet …</option>
                  {interactive.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {(d.trigger_type === "majority_choice" || d.trigger_type === "response_distribution") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-opt">Svarmulighed (nr.)</Label>
                <Input
                  id="c-opt"
                  type="number"
                  min={1}
                  className="mt-2"
                  value={d.option_index + 1}
                  onChange={(e) => patch({ option_index: Math.max(0, Number(e.target.value) - 1) })}
                />
              </div>
              {d.trigger_type === "response_distribution" && (
                <div>
                  <Label htmlFor="c-share">Mindst andel (%)</Label>
                  <Input
                    id="c-share"
                    type="number"
                    min={1}
                    max={100}
                    className="mt-2"
                    value={d.min_share}
                    onChange={(e) => patch({ min_share: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
          )}

          {d.trigger_type === "threshold" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Gennemsnit er</Label>
                <select
                  className="mt-2 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
                  value={d.comparator}
                  onChange={(e) => patch({ comparator: e.target.value as Draft["comparator"] })}
                >
                  <option value="gte">mindst</option>
                  <option value="gt">over</option>
                  <option value="lte">højst</option>
                  <option value="lt">under</option>
                  <option value="eq">præcis</option>
                </select>
              </div>
              <div>
                <Label htmlFor="c-val">Værdi</Label>
                <Input
                  id="c-val"
                  type="number"
                  className="mt-2"
                  value={d.value}
                  onChange={(e) => patch({ value: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <Label>Ændringer i World-tilstanden</Label>
              {states.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    setD((prev) => ({
                      ...prev,
                      changes: [
                        ...prev.changes,
                        { state_key: states[0]!.state_key, operation: "decrease", value: 5 } as StateChange,
                      ],
                    }))
                  }
                >
                  Tilføj ændring
                </Button>
              )}
            </div>
            <div className="mt-2 space-y-3">
              {d.changes.map((c, i) => {
                const variable = states.find((s) => s.state_key === c.state_key);
                return (
                  <div key={i} className="rounded-xl border border-border/70 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_100px_auto]">
                      <select
                        className="rounded-lg border border-border/70 bg-background px-2 py-2 text-sm"
                        value={c.state_key}
                        onChange={(e) => patchChange(i, { state_key: e.target.value })}
                      >
                        {states.map((s) => (
                          <option key={s.id} value={s.state_key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-border/70 bg-background px-2 py-2 text-sm"
                        value={c.operation}
                        onChange={(e) =>
                          patchChange(i, { operation: e.target.value as StateOperation })
                        }
                      >
                        {OPERATIONS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {c.operation === "boolean_toggle" ? (
                        <span className="self-center text-sm text-muted-foreground">—</span>
                      ) : variable?.value_type === "enum" ? (
                        <select
                          className="rounded-lg border border-border/70 bg-background px-2 py-2 text-sm"
                          value={String(c.value ?? "")}
                          onChange={(e) => patchChange(i, { value: e.target.value })}
                        >
                          {(variable.enum_options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={String(c.value ?? "")}
                          onChange={(e) =>
                            patchChange(i, {
                              value:
                                variable?.value_type === "number"
                                  ? Number(e.target.value)
                                  : e.target.value,
                            })
                          }
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() =>
                          setD((prev) => ({
                            ...prev,
                            changes: prev.changes.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{describeChange(variable, c)}</p>
                  </div>
                );
              })}
            </div>
            {preview.applied.length > 0 && (
              <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
                Forhåndsvisning:{" "}
                {preview.applied
                  .map((a) => `${a.label}: ${String(a.before)} → ${String(a.after)}`)
                  .join(" · ")}
              </p>
            )}
            {preview.errors.length > 0 && (
              <p className="mt-2 text-sm text-destructive">{preview.errors[0]}</p>
            )}
          </div>

          <div>
            <Label>Hvornår mærkes det?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {REVEALS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => patch({ reveal_timing: r })}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    d.reveal_timing === r
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {REVEAL_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="c-rationale">Faglig begrundelse</Label>
            <Textarea
              id="c-rationale"
              className="mt-2"
              rows={2}
              placeholder="Hvilken faglig pointe viser konsekvensen?"
              value={d.academic_rationale}
              onChange={(e) => patch({ academic_rationale: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="c-student">Forklaring til eleverne</Label>
            <Textarea
              id="c-student"
              className="mt-2"
              rows={2}
              value={d.student_explanation}
              onChange={(e) => patch({ student_explanation: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button className="rounded-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Gem konsekvens
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Annullér
          </Button>
          {editing && (
            <Button
              variant="ghost"
              className="ml-auto rounded-full text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Slet
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
