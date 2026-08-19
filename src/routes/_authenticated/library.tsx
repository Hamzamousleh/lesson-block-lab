import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, Trash2 } from "lucide-react";
import {
  deleteLibraryItem,
  libraryQuery,
  reuseLibraryBlock,
  reuseLibraryLesson,
  type LibraryBlockData,
  type LibraryLessonData,
} from "@/lib/library";
import { blocksQuery, classesQuery, lessonsQuery, unitsQuery } from "@/lib/data";
import { blockDef } from "@/lib/blocks";
import type { ResponseExampleData } from "@/lib/response-export";
import type { LibraryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Mit bibliotek — Didaktiva" },
      { name: "description", content: "Gem og genbrug dine bedste aktiviteter og lektioner." },
      { property: "og:title", content: "Mit bibliotek — Didaktiva" },
      { property: "og:description", content: "Genbrug dine bedste aktiviteter og lektioner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LibraryPage,
});

type Filter = "all" | "block" | "lesson" | "response_example";

function LibraryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const items = useQuery(libraryQuery());
  const lessons = useQuery(lessonsQuery());
  const classes = useQuery(classesQuery());
  const units = useQuery(unitsQuery());

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [reuse, setReuse] = useState<LibraryItem | null>(null);
  const [view, setView] = useState<LibraryItem | null>(null);

  // reuse dialog state
  const [targetLessonId, setTargetLessonId] = useState("");
  const [insertion, setInsertion] = useState("bottom");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetUnitId, setTargetUnitId] = useState("none");

  const targetBlocks = useQuery({
    ...blocksQuery(targetLessonId),
    enabled: !!targetLessonId,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items.data ?? []).filter((i) => {
      if (filter !== "all" && i.item_type !== filter) return false;
      if (!term) return true;
      return (
        i.title.toLowerCase().includes(term) ||
        (i.subject ?? "").toLowerCase().includes(term) ||
        i.tags.join(" ").toLowerCase().includes(term)
      );
    });
  }, [items.data, filter, q]);

  const del = useMutation({
    mutationFn: deleteLibraryItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.success("Elementet er slettet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runReuse = useMutation({
    mutationFn: async (item: LibraryItem) => {
      if (item.item_type === "block") {
        if (!targetLessonId) throw new Error("Vælg en lektion.");
        await reuseLibraryBlock(
          item,
          targetLessonId,
          insertion === "top"
            ? { kind: "top" }
            : insertion === "bottom"
              ? { kind: "bottom" }
              : { kind: "after", blockId: insertion },
        );
        return targetLessonId;
      }
      if (!targetClassId) throw new Error("Vælg en klasse.");
      return reuseLibraryLesson(item, {
        classId: targetClassId,
        unitId: targetUnitId === "none" ? null : targetUnitId,
      });
    },
    onSuccess: async (lessonId) => {
      await queryClient.invalidateQueries();
      setReuse(null);
      toast.success("Klar til redigering ✓");
      navigate({ to: "/lessons/$lessonId/edit", params: { lessonId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="font-display text-4xl font-semibold">Mit bibliotek</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Gemte undervisningselementer, du kan genbruge: aktiviteter, lektioner og eksempler på
        elevsvar. Dine filer ligger under Materialer.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {(
          [
            { key: "all", label: "Alle" },
            { key: "block", label: "Aktiviteter" },
            { key: "lesson", label: "Lektioner" },
            { key: "response_example", label: "Elevsvar" },
          ] as { key: Filter; label: string }[]
        ).map((t) => (
          <Button
            key={t.key}
            variant={filter === t.key ? "default" : "outline"}
            aria-pressed={filter === t.key}
            className="rounded-full"
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </Button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg"
            className="rounded-full pl-9"
          />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {items.isLoading && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Henter bibliotek …
          </p>
        )}
        {items.isError && <p className="text-destructive">Biblioteket kunne ikke hentes.</p>}
        {!items.isLoading && filtered.length === 0 && (
          <div className="surface-card border-dashed p-10 text-center">
            <p className="text-lg font-medium">Biblioteket er tomt</p>
            <p className="mt-1 text-muted-foreground">
              Gem en aktivitet fra lektionseditoren med “Gem i bibliotek”.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/lessons">Gå til lektioner</Link>
            </Button>
          </div>
        )}
        {filtered.map((i) => (
          <div key={i.id} className="group relative flex flex-col gap-4 rounded-3xl border border-border/80 bg-card px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift hover:border-primary/30 sm:flex-row sm:items-center sm:px-6">
            <span className="text-xl">
              {i.item_type === "block"
                ? blockDef(i.block_type ?? "").icon
                : i.item_type === "response_example"
                  ? "💬"
                  : "📚"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-medium">{i.title}</p>
              <p className="text-sm text-muted-foreground">
                {i.item_type === "block"
                  ? blockDef(i.block_type ?? "").label
                  : i.item_type === "response_example"
                    ? "Gemte elevsvar"
                    : "Lektionsskabelon"}
                {i.subject ? ` · ${i.subject}` : ""} · {i.duration_minutes} min
                {i.tags.length ? ` · ${i.tags.join(", ")}` : ""}
              </p>
            </div>
            {i.item_type !== "response_example" && (
              <Button
                className="rounded-full"
                onClick={() => {
                  setReuse(i);
                  setTargetLessonId("");
                  setInsertion("bottom");
                  setTargetClassId("");
                  setTargetUnitId("none");
                }}
              >
                Brug igen
              </Button>
            )}
            <Button variant="outline" className="rounded-full" onClick={() => setView(i)}>
              Se
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Slet"
              disabled={del.isPending}
              onClick={() => {
                if (confirm("Vil du slette dette element fra biblioteket?")) del.mutate(i.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* reuse dialog */}
      <Dialog open={!!reuse} onOpenChange={(v) => !v && setReuse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Brug igen</DialogTitle>
            <DialogDescription>{reuse?.title}</DialogDescription>
          </DialogHeader>
          {reuse?.item_type === "block" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lektion</Label>
                <Select value={targetLessonId} onValueChange={setTargetLessonId}>
                  <SelectTrigger aria-label="Lektion" className="rounded-xl">
                    <SelectValue placeholder="Vælg lektion" />
                  </SelectTrigger>
                  <SelectContent>
                    {(lessons.data ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placering</Label>
                <Select value={insertion} onValueChange={setInsertion}>
                  <SelectTrigger aria-label="Placering" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Øverst</SelectItem>
                    <SelectItem value="bottom">Nederst</SelectItem>
                    {(targetBlocks.data ?? [])
                      .filter((b) => !b.is_fallback)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          Efter: {b.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Klasse</Label>
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                  <SelectTrigger aria-label="Klasse" className="rounded-xl">
                    <SelectValue placeholder="Vælg klasse" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forløb (valgfrit)</Label>
                <Select value={targetUnitId} onValueChange={setTargetUnitId}>
                  <SelectTrigger aria-label="Forløb" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Intet forløb</SelectItem>
                    {(units.data ?? [])
                      .filter((u) => !targetClassId || u.class_id === targetClassId)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Button
            className="mt-2 rounded-full"
            disabled={runReuse.isPending}
            onClick={() => reuse && runReuse.mutate(reuse)}
          >
            {runReuse.isPending && <Loader2 className="size-4 animate-spin" />} Indsæt
          </Button>
        </DialogContent>
      </Dialog>

      {/* view dialog */}
      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
            <DialogDescription>
              {view?.item_type === "block"
                ? "Aktivitet"
                : view?.item_type === "response_example"
                  ? "Gemte elevsvar"
                  : "Lektionsskabelon"}
            </DialogDescription>
          </DialogHeader>
          {view?.item_type === "response_example" ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {(view.data as unknown as ResponseExampleData).block_title}
                {(view.data as unknown as ResponseExampleData).question
                  ? ` · ${(view.data as unknown as ResponseExampleData).question}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Kilde: Elevsession
                {(view.data as unknown as ResponseExampleData).source_session_id ? (
                  <>
                    {" · "}
                    <Link
                      to="/sessions/$sessionId"
                      params={{
                        sessionId: (view.data as unknown as ResponseExampleData)
                          .source_session_id as string,
                      }}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Åbn session
                    </Link>
                  </>
                ) : null}
                {" · Gemt "}
                {new Date(
                  (view.data as unknown as ResponseExampleData).captured_at,
                ).toLocaleDateString("da-DK")}
              </p>
              <ul className="space-y-2">
                {((view.data as unknown as ResponseExampleData).examples ?? []).map((t, i) => (
                  <li key={i} className="rounded-xl bg-secondary/40 px-4 py-3 whitespace-pre-wrap">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : view?.item_type === "lesson" ? (
            <ol className="space-y-2 text-sm">
              {((view.data as unknown as LibraryLessonData).blocks ?? []).map((b, i) => (
                <li key={i} className="rounded-xl bg-secondary/40 px-4 py-3">
                  {blockDef(b.type).icon} {b.title} · {b.duration_minutes} min
                  {b.is_fallback ? " · ekstra" : ""}
                </li>
              ))}
            </ol>
          ) : (
            <pre className="rounded-xl bg-secondary/40 p-4 text-xs whitespace-pre-wrap">
              {JSON.stringify((view?.data as unknown as LibraryBlockData)?.content ?? {}, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
