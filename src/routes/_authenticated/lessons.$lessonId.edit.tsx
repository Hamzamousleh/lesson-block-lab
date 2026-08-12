import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookmarkPlus,
  Copy,
  GripVertical,
  Loader2,
  Play,
  Plus,
  Timer,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  addBlock,
  blocksQuery,
  classQuery,
  deleteBlock,
  deleteLesson,
  duplicateBlock,
  duplicateLesson,
  lessonQuery,
  persistOrder,
  updateBlock,
  updateLesson,
} from "@/lib/data";
import { saveBlockToLibrary, saveLessonToLibrary } from "@/lib/library";
import { blockDef } from "@/lib/blocks";
import { lessonToText } from "@/lib/prompt";
import { LESSON_STATUS_LABEL, type LessonBlock, type LessonStatus } from "@/lib/types";
import { ActivityPicker } from "@/components/editor/ActivityPicker";
import { BlockEditor, type BlockDraft } from "@/components/editor/BlockEditor";
import { StartSessionDialog } from "@/components/session/StartSessionDialog";
import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/lessons/$lessonId/edit")({
  head: () => ({
    meta: [
      { title: "Lektionseditor — CaseLab" },
      { name: "description", content: "Byg lektionen af aktiviteter på en visuel tidslinje." },
      { property: "og:title", content: "Lektionseditor — CaseLab" },
      { property: "og:description", content: "Byg lektionen af aktiviteter på en tidslinje." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LessonEditor,
});

function LessonEditor() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const lesson = useQuery(lessonQuery(lessonId));
  const blocks = useQuery(blocksQuery(lessonId));
  const klass = useQuery({
    ...classQuery(lesson.data?.class_id ?? ""),
    enabled: !!lesson.data?.class_id,
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<LessonBlock | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);


  const all = blocks.data ?? [];
  const list = all.filter((b) => !b.is_fallback);
  const fallbacks = all.filter((b) => b.is_fallback);
  const planned = list.reduce((sum, b) => sum + b.duration_minutes, 0);
  const target = lesson.data?.duration_minutes ?? 0;
  const over = planned > target;

  const invalidateBlocks = () => queryClient.invalidateQueries({ queryKey: ["blocks", lessonId] });

  const add = useMutation({
    mutationFn: (type: string) => addBlock(lessonId, type, list.length),
    onSuccess: async (b) => {
      await invalidateBlocks();
      setEditing(b);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: BlockDraft }) =>
      updateBlock(id, {
        title: patch.title,
        duration_minutes: patch.duration_minutes,
        student_instructions: patch.student_instructions || null,
        teacher_notes: patch.teacher_notes || null,
        content: patch.content,
      }),
    onSuccess: async () => {
      await invalidateBlocks();
      setEditing(null);
      toast.success("Aktiviteten er gemt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteBlock,
    onSuccess: async () => {
      await invalidateBlocks();
      toast.success("Aktiviteten er slettet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dup = useMutation({
    mutationFn: (b: LessonBlock) => duplicateBlock(b, list),
    onSuccess: invalidateBlocks,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFallback = useMutation({
    mutationFn: (b: LessonBlock) => updateBlock(b.id, { is_fallback: !b.is_fallback }),
    onSuccess: async () => {
      await invalidateBlocks();
      toast.success("Aktiviteten er flyttet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBlock = useMutation({
    mutationFn: (b: LessonBlock) =>
      saveBlockToLibrary(b, { subject: lesson.data?.subject ?? klass.data?.subject ?? null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.success("Aktiviteten er gemt i biblioteket ✓");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLesson = useMutation({
    mutationFn: () => saveLessonToLibrary(lesson.data!, all),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.success("Lektionen er gemt som skabelon ✓");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: persistOrder,
    onSuccess: invalidateBlocks,
    onError: (e: Error) => toast.error(e.message),
  });

  const patchLesson = useMutation({
    mutationFn: (patch: Parameters<typeof updateLesson>[1]) => updateLesson(lessonId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const dupLesson = useMutation({
    mutationFn: () => duplicateLesson(lessonId),
    onSuccess: async (copy) => {
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lektionen er kopieret");
      navigate({ to: "/lessons/$lessonId/edit", params: { lessonId: copy.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delLesson = useMutation({
    mutationFn: () => deleteLesson(lessonId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lektionen er slettet");
      navigate({ to: "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = list.map((b) => b.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0] as string);
    reorder.mutate([...ids, ...fallbacks.map((b) => b.id)]);
  };

  if (lesson.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-20 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter lektion …
      </div>
    );
  }
  if (lesson.isError || !lesson.data) {
    return <p className="mx-auto max-w-4xl px-6 py-20 text-destructive">Lektionen kunne ikke hentes.</p>;
  }

  let running = 0;

  const blockRow = (b: LessonBlock, meta: string, draggable: boolean) => {
    const def = blockDef(b.type);
    return (
      <div
        key={b.id}
        draggable={draggable}
        onDragStart={() => draggable && setDragId(b.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (draggable && dragId) moveTo(dragId, b.id);
          setDragId(null);
        }}
        className={`surface-card flex items-center gap-4 px-5 py-4 transition-shadow ${
          dragId === b.id ? "opacity-50" : ""
        }`}
      >
        {draggable ? (
          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="w-14 shrink-0 text-sm tabular-nums text-muted-foreground">{meta}</span>
        <span className="text-xl">{def.icon}</span>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(b)}>
          <span className="block truncate font-medium">{b.title}</span>
          <span className="block text-sm text-muted-foreground">
            {def.label} · {b.duration_minutes} min
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Gem i bibliotek"
          disabled={saveBlock.isPending}
          onClick={() => saveBlock.mutate(b)}
        >
          <BookmarkPlus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs"
          onClick={() => toggleFallback.mutate(b)}
        >
          {b.is_fallback ? "Gør aktiv" : "Gør til ekstra"}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Dublér aktivitet" onClick={() => dup.mutate(b)}>
          <Copy className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Slet aktivitet"
          onClick={() => remove.mutate(b.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/classes" className="hover:text-foreground">
            Klasser
          </Link>
          {klass.data && (
            <>
              <span>/</span>
              <Link
                to="/classes/$classId"
                params={{ classId: klass.data.id }}
                className="hover:text-foreground"
              >
                {klass.data.name}
              </Link>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/lessons/$lessonId/run" params={{ lessonId }}>
            <Button className="rounded-full">
              <Play className="size-4" /> Start undervisning
            </Button>
          </Link>
          <Button variant="outline" className="rounded-full" onClick={() => setSessionOpen(true)}>
            <Smartphone className="size-4" /> Start elevsession
          </Button>

          <Link to="/import" search={{ lessonId }}>
            <Button variant="outline" className="rounded-full">
              <Plus className="size-4" /> Importér aktiviteter
            </Button>
          </Link>
          <Link to="/extra-time" search={{ lessonId }}>
            <Button variant="outline" className="rounded-full">
              <Timer className="size-4" /> Jeg mangler tid
            </Button>
          </Link>
          <Link to="/improve-lesson" search={{ lessonId }}>
            <Button variant="outline" className="rounded-full">
              <Wand2 className="size-4" /> Gør den mere aktiv
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={saveLesson.isPending}
            onClick={() => saveLesson.mutate()}
          >
            <BookmarkPlus className="size-4" /> Gem i bibliotek
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              const text = lessonToText(lesson.data!, list);
              try {
                await navigator.clipboard.writeText(text);
                toast.success("Lektionen er kopieret ✓");
              } catch {
                toast.error("Lektionen kunne ikke kopieres. Markér teksten og kopiér manuelt.");
              }
            }}
          >
            <Copy className="size-4" /> Kopiér lektion til ChatGPT
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={dupLesson.isPending}
            onClick={() => dupLesson.mutate()}
          >
            <Copy className="size-4" /> Dublér
          </Button>
          <Button
            variant="ghost"
            className="rounded-full text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Vil du slette denne lektion?")) delLesson.mutate();
            }}
          >
            <Trash2 className="size-4" /> Slet
          </Button>
        </div>
      </div>

      <div className="surface-card mt-6 p-8">
        <Input
          value={lesson.data.title}
          onChange={(e) =>
            queryClient.setQueryData(["lesson", lessonId], {
              ...lesson.data,
              title: e.target.value,
            })
          }
          onBlur={(e) => patchLesson.mutate({ title: e.target.value })}
          className="h-auto border-0 bg-transparent px-0 font-display !text-3xl font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {klass.data ? `${klass.data.name} · ${klass.data.subject}` : ""}
          </span>
          {lesson.data.mode === "rescue" && (
            <span className="rounded-full bg-accent-warm px-3 py-1 font-medium text-accent-warm-foreground">
              ⚡ Nødlektion
            </span>
          )}
          <span
            className={
              over
                ? "rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive"
                : "rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground"
            }
          >
            {planned} / {target} min
          </span>
          <Select
            value={lesson.data.status}
            onValueChange={(v) => patchLesson.mutate({ status: v as LessonStatus })}
          >
            <SelectTrigger className="w-36 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LESSON_STATUS_LABEL) as LessonStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {LESSON_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {lesson.data.learning_goal && (
          <p className="mt-4 text-muted-foreground">{lesson.data.learning_goal}</p>
        )}
      </div>

      <div className="mt-10 space-y-3">
        {list.length === 0 && (
          <div className="surface-card border-dashed p-10 text-center">
            <p className="text-lg font-medium">Tidslinjen er tom</p>
            <p className="mt-1 text-muted-foreground">
              Tilføj din første aktivitet for at bygge timen op.
            </p>
          </div>
        )}

        {list.map((b) => {
          const start = running;
          running += b.duration_minutes;
          return blockRow(b, `${start}–${running}`, true);
        })}

        <Button
          variant="outline"
          className="w-full rounded-2xl border-dashed py-7"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="size-4" /> Tilføj aktivitet
        </Button>
      </div>

      {fallbacks.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold">Hvis du får tid til overs</h2>
          <p className="mt-1 text-muted-foreground">
            Disse aktiviteter tæller ikke med i lektionens varighed.
          </p>
          <div className="mt-4 space-y-3">
            {fallbacks.map((b) => blockRow(b, `${b.duration_minutes}m`, false))}
          </div>
        </div>
      )}

      <ActivityPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(type) => add.mutate(type)}
      />
      <BlockEditor
        block={editing}
        saving={save.isPending}
        onClose={() => setEditing(null)}
        onSave={(patch) => editing && save.mutate({ id: editing.id, patch })}
      />
    </div>
  );
}
