import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Plus } from "lucide-react";
import { classQuery, createUnit, lessonsQuery, unitsQuery, updateUnit } from "@/lib/data";
import { UNIT_STATUS_LABEL, type UnitStatus } from "@/lib/types";
import { ClassInsight } from "@/components/class/ClassInsight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

export const Route = createFileRoute("/_authenticated/classes/$classId")({
  head: () => ({
    meta: [
      { title: "Klasse — Didaktiva" },
      { name: "description", content: "Klassens forløb og seneste lektioner." },
      { property: "og:title", content: "Klasse — Didaktiva" },
      { property: "og:description", content: "Klassens forløb og seneste lektioner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassPage,
});

function ClassPage() {
  const { classId } = Route.useParams();
  const klass = useQuery(classQuery(classId));
  const units = useQuery(unitsQuery(classId));
  const lessons = useQuery(lessonsQuery({ classId }));
  const [unitOpen, setUnitOpen] = useState(false);

  const activeUnit = (units.data ?? []).find((u) => u.status === "active");

  if (klass.isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-20 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter klasse …
      </div>
    );
  }
  if (klass.isError || !klass.data) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-20 text-destructive">Klassen kunne ikke hentes.</p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">{klass.data.name}</h1>
          <p className="mt-1 text-lg text-primary">{klass.data.subject}</p>
          {klass.data.school_year && (
            <p className="mt-1 text-sm text-muted-foreground">{klass.data.school_year}</p>
          )}
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Forløb samler et fagligt tema. Lektioner er de konkrete undervisningsgange.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => setUnitOpen(true)}>
            <Plus className="size-4" /> Opret forløb
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/lessons/new" search={{ classId }}>
              <Plus className="size-4" /> Opret lektion
            </Link>
          </Button>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Aktuelt forløb</h2>
        {activeUnit ? (
          <div className="surface-quiet mt-4 p-7">
            <p className="text-xl font-medium">{activeUnit.title}</p>
            {activeUnit.description && (
              <p className="mt-2 text-muted-foreground">{activeUnit.description}</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            Der er ikke sat et aktivt forløb for klassen endnu.
          </p>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Seneste lektioner</h2>
        <div className="mt-4 space-y-3">
          {lessons.data?.length === 0 && (
            <div className="surface-quiet border-dashed p-8">
              <p className="text-lg font-medium">Ingen lektioner i denne klasse endnu</p>
              <p className="mt-1 text-muted-foreground">
                Opret den første lektion og byg undervisningen trin for trin.
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link to="/lessons/new" search={{ classId }}>
                  <Plus className="size-4" /> Opret lektion i denne klasse
                </Link>
              </Button>
            </div>
          )}
          {lessons.data?.slice(0, 6).map((l) => (
            <div key={l.id} className="group relative flex flex-col gap-4 rounded-2xl border border-border/80 bg-card px-5 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-accent/15 sm:flex-row sm:items-center sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium">{l.title}</p>
                <p className="text-sm text-muted-foreground">
                  {l.duration_minutes} min
                  {l.unit_id
                    ? ` · ${units.data?.find((u) => u.id === l.unit_id)?.title ?? "Forløb"}`
                    : ""}
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link to="/lessons/$lessonId/run" params={{ lessonId: l.id }}>
                  <Play className="size-4" /> Kør lektion
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/lessons/$lessonId/edit" params={{ lessonId: l.id }}>
                  Redigér
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Forløb</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {units.data?.length === 0 && (
            <div className="surface-quiet border-dashed p-8 sm:col-span-2">
              <p className="text-lg font-medium">Ingen forløb endnu</p>
              <p className="mt-1 text-muted-foreground">
                Opret et fagligt tema, så lektionerne får en tydelig sammenhæng.
              </p>
              <Button className="mt-5 rounded-full" onClick={() => setUnitOpen(true)}>
                <Plus className="size-4" /> Opret forløb i denne klasse
              </Button>
            </div>
          )}
          {units.data?.map((u) => (
            <UnitCard
              key={u.id}
              unitId={u.id}
              title={u.title}
              description={u.description}
              status={u.status}
              classId={classId}
            />
          ))}
        </div>
      </section>

      <ClassInsight classId={classId} className={klass.data.name} subject={klass.data.subject} />

      <NewUnitDialog open={unitOpen} onOpenChange={setUnitOpen} classId={classId} />
    </div>
  );
}

function UnitCard({
  unitId,
  title,
  description,
  status,
  classId,
}: {
  unitId: string;
  title: string;
  description: string | null;
  status: UnitStatus;
  classId: string;
}) {
  const queryClient = useQueryClient();
  const mutate = useMutation({
    mutationFn: (s: UnitStatus) => updateUnit(unitId, { status: s }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units", classId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-quiet flex flex-col gap-3 p-6 transition-colors duration-200 hover:border-primary/30">
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Select value={status} onValueChange={(v) => mutate.mutate(v as UnitStatus)}>
        <SelectTrigger aria-label="Forløbsstatus" className="w-40 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(UNIT_STATUS_LABEL) as UnitStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {UNIT_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button asChild variant="outline" className="mt-auto rounded-full">
        <Link to="/lessons/new" search={{ classId, unitId }}>
          <Plus className="size-4" /> Opret lektion i forløbet
        </Link>
      </Button>
    </div>
  );
}

function NewUnitDialog({
  open,
  onOpenChange,
  classId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classId: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<UnitStatus>("planned");

  const create = useMutation({
    mutationFn: () =>
      createUnit({ class_id: classId, title, description: description || null, status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Forløbet er oprettet");
      setTitle("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nyt forløb</DialogTitle>
          <DialogDescription>
            Et forløb er et fagligt tema med en eller flere lektioner, fx Socialpsykologi.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!create.isPending) create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="u-title">Titel</Label>
            <Input id="u-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-desc">Beskrivelse</Label>
            <Textarea
              id="u-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as UnitStatus)}>
              <SelectTrigger aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(UNIT_STATUS_LABEL) as UnitStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {UNIT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />} Opret forløb
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
