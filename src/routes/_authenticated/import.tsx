import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { classesQuery, lessonsQuery, unitsQuery, blocksQuery } from "@/lib/data";
import { validatePackage, totalDuration, type CaseLabPackage } from "@/lib/caselab-package";
import { EXAMPLE_BLOCKS, EXAMPLE_LESSON } from "@/lib/examples";
import { importBlocksPackage, importLessonPackage, type InsertionPoint } from "@/lib/import-package";
import { blockDef } from "@/lib/blocks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/import")({
  validateSearch: (search: Record<string, unknown>): { lessonId?: string } =>
    typeof search["lessonId"] === "string" ? { lessonId: search["lessonId"] } : {},
  head: () => ({
    meta: [
      { title: "Importér fra ChatGPT — CaseLab" },
      {
        name: "description",
        content: "Indsæt en CaseLab-pakke fra ChatGPT og gør den klar til undervisning.",
      },
      { property: "og:title", content: "Importér fra ChatGPT — CaseLab" },
      { property: "og:description", content: "Indsæt en CaseLab-pakke og importér den." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportPage,
});

type Target = "new" | "existing";

function ImportPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const classes = useQuery(classesQuery());
  const lessons = useQuery(lessonsQuery());
  const units = useQuery(unitsQuery());

  const [target, setTarget] = useState<Target>(search.lessonId ? "existing" : "new");
  const [classId, setClassId] = useState("");
  const [unitId, setUnitId] = useState("none");
  const [lessonId, setLessonId] = useState(search.lessonId ?? "");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<{ ok: boolean; errors: string[]; data?: CaseLabPackage } | null>(
    null,
  );
  const [insertion, setInsertion] = useState<string>("bottom");

  const targetBlocks = useQuery({ ...blocksQuery(lessonId), enabled: !!lessonId });

  const unitOptions = (units.data ?? []).filter((u) => !classId || u.class_id === classId);
  const pkg = result?.ok ? result.data : undefined;

  const blocks = useMemo(() => {
    if (!pkg) return [];
    return pkg.package_type === "lesson" ? pkg.lesson.blocks : pkg.blocks;
  }, [pkg]);

  const runImport = useMutation({
    mutationFn: async () => {
      if (!pkg) throw new Error("Pakken kan ikke importeres endnu.");
      if (pkg.package_type === "lesson") {
        if (!classId) throw new Error("Vælg en klasse først.");
        return {
          kind: "lesson" as const,
          lessonId: await importLessonPackage(pkg, {
            classId,
            unitId: unitId === "none" ? null : unitId,
          }),
          count: pkg.lesson.blocks.length,
        };
      }
      if (!lessonId) throw new Error("Vælg en lektion at tilføje aktiviteterne til.");
      const point: InsertionPoint =
        insertion === "top"
          ? { kind: "top" }
          : insertion === "bottom"
            ? { kind: "bottom" }
            : { kind: "after", blockId: insertion };
      const ids = await importBlocksPackage(pkg, lessonId, point);
      return { kind: "blocks" as const, lessonId, count: ids.length };
    },
    onSuccess: async (r) => {
      await queryClient.invalidateQueries();
      toast.success(
        r.kind === "lesson" ? "Lektionen er importeret ✓" : `${r.count} aktiviteter tilføjet ✓`,
      );
      navigate({ to: "/lessons/$lessonId/edit", params: { lessonId: r.lessonId } });
    },
    onError: (e: Error) => toast.error(e.message || "Importen kunne ikke gennemføres"),
  });

  const preview = () => setResult(validatePackage(json));

  const insertExample = (which: "lesson" | "blocks") => {
    setJson(JSON.stringify(which === "lesson" ? EXAMPLE_LESSON : EXAMPLE_BLOCKS, null, 2));
    setResult(null);
  };

  const plannedMinutes = totalDuration(blocks);

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-display text-4xl font-semibold">Importér fra ChatGPT</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Indsæt en CaseLab-pakke og gør den klar til undervisning.
      </p>

      {/* step 1 */}
      <section className="surface-card mt-10 space-y-5 p-8">
        <h2 className="text-xl font-semibold">Hvad vil du importere til?</h2>
        <div className="flex flex-wrap gap-3">
          {(
            [
              { key: "new", label: "Ny lektion" },
              { key: "existing", label: "Eksisterende lektion" },
            ] as { key: Target; label: string }[]
          ).map((o) => (
            <Button
              key={o.key}
              variant={target === o.key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setTarget(o.key)}
            >
              {o.label}
            </Button>
          ))}
        </div>

        {target === "new" ? (
          classes.data?.length === 0 ? (
            <p className="text-sm text-destructive">
              Du skal oprette en klasse, før du kan importere en lektion.{" "}
              <Link to="/classes" className="underline">
                Opret klasse
              </Link>
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Klasse</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="rounded-xl">
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
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Intet forløb" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Intet forløb</SelectItem>
                    {unitOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        ) : lessons.data?.length === 0 ? (
          <p className="text-sm text-destructive">
            Du har ingen lektioner at tilføje aktiviteter til endnu.
          </p>
        ) : (
          <div className="space-y-2">
            <Label>Lektion</Label>
            <Select value={lessonId} onValueChange={setLessonId}>
              <SelectTrigger className="rounded-xl">
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
        )}
      </section>

      {/* json input */}
      <section className="surface-card mt-6 space-y-4 p-8">
        <h2 className="text-xl font-semibold">CaseLab-pakke</h2>
        <Textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setResult(null);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text) setTimeout(() => setResult(validatePackage(text)), 0);
          }}
          placeholder="Indsæt CaseLab JSON fra ChatGPT her…"
          className="min-h-56 rounded-xl font-mono text-xs"
        />
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-full" onClick={preview}>
            Forhåndsvis
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => insertExample("lesson")}>
            Eksempel: Hel lektion
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => insertExample("blocks")}>
            Eksempel: Tre aktiviteter
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setJson("");
              setResult(null);
            }}
          >
            Ryd
          </Button>
        </div>

        {result && !result.ok && (
          <div className="rounded-xl bg-destructive/10 p-5 text-destructive">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4" /> Pakken kan ikke importeres endnu
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {result?.ok && (
          <p className="flex items-center gap-2 font-medium text-primary">
            <CheckCircle2 className="size-4" /> Gyldig CaseLab-pakke
          </p>
        )}
      </section>

      {/* preview */}
      {pkg && (
        <section className="surface-card mt-6 space-y-6 p-8">
          {pkg.package_type === "lesson" ? (
            <>
              <div>
                <h2 className="font-display text-2xl font-semibold">Klar til import</h2>
                <p className="mt-2 text-lg font-medium">{pkg.lesson.title}</p>
                <dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    Klasse:{" "}
                    {classes.data?.find((c) => c.id === classId)?.name ?? "Ikke valgt endnu"}
                  </div>
                  <div>Fag: {pkg.lesson.subject ?? "—"}</div>
                  <div>Varighed: {pkg.lesson.duration_minutes} min</div>
                  <div>Tilstand: {pkg.mode === "rescue" ? "Red mig" : "Standard"}</div>
                </dl>
                {pkg.lesson.learning_goal && (
                  <p className="mt-3 text-muted-foreground">{pkg.lesson.learning_goal}</p>
                )}
                {!!pkg.lesson.tags?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pkg.lesson.tags.map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <h2 className="font-display text-2xl font-semibold">Klar til at indsætte</h2>
              <p className="mt-2 text-muted-foreground">
                {blocks.length} aktiviteter · {plannedMinutes} minutter
              </p>
            </div>
          )}

          <ol className="space-y-2">
            {blocks.map((b, i) => {
              const def = blockDef(b.type);
              return (
                <li key={i} className="flex items-center gap-4 rounded-xl bg-secondary/40 px-5 py-4">
                  <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xl">{def.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                      {def.label}
                    </p>
                    <p className="truncate font-medium">{b.title}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{b.duration_minutes} min</span>
                </li>
              );
            })}
          </ol>

          <p className="text-sm text-muted-foreground">
            {blocks.length} aktiviteter · {plannedMinutes} minutter
            {pkg.package_type === "lesson" &&
              plannedMinutes !== pkg.lesson.duration_minutes &&
              (plannedMinutes < pkg.lesson.duration_minutes
                ? ` · Aktiviteterne fylder ${plannedMinutes} af ${pkg.lesson.duration_minutes} minutter.`
                : ` · Aktiviteterne er ${plannedMinutes - pkg.lesson.duration_minutes} minutter over den planlagte tid.`)}
          </p>

          {pkg.package_type === "blocks" && (
            <div className="space-y-2">
              <Label>Hvor skal aktiviteterne indsættes?</Label>
              <Select value={insertion} onValueChange={setInsertion}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Øverst i lektionen</SelectItem>
                  <SelectItem value="bottom">Nederst i lektionen</SelectItem>
                  {(targetBlocks.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Efter aktivitet: {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="rounded-full"
            disabled={runImport.isPending}
            onClick={() => runImport.mutate()}
          >
            {runImport.isPending && <Loader2 className="size-4 animate-spin" />}
            {pkg.package_type === "lesson" ? "Importér lektion" : "Indsæt aktiviteter"}
          </Button>
        </section>
      )}
    </div>
  );
}
