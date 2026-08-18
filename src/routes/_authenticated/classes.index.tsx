import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { classesQuery, createClass, lessonsQuery, unitsQuery } from "@/lib/data";
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

export const Route = createFileRoute("/_authenticated/classes/")({
  head: () => ({
    meta: [
      { title: "Mine klasser — CaseLab" },
      { name: "description", content: "Overblik over dine klasser, forløb og lektioner." },
      { property: "og:title", content: "Mine klasser — CaseLab" },
      { property: "og:description", content: "Overblik over dine klasser, forløb og lektioner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const classes = useQuery(classesQuery());
  const units = useQuery(unitsQuery());
  const lessons = useQuery(lessonsQuery());
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Mine klasser</h1>
          <p className="mt-2 text-muted-foreground">
            En klasse er dit undervisningshold. Her samler du forløb og lektioner.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Ny klasse
        </Button>
      </div>

      {classes.isLoading && (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter klasser …
        </div>
      )}
      {classes.isError && <p className="mt-10 text-destructive">Kunne ikke hente dine klasser.</p>}

      {classes.data?.length === 0 && (
        <div className="surface-card mt-10 p-10 text-center">
          <h2 className="text-xl font-semibold">Du har ingen klasser endnu</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Opret din første klasse, så kan du bygge forløb og lektioner ovenpå.
          </p>
          <Button className="mt-6 rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Ny klasse
          </Button>
        </div>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {classes.data?.map((c) => {
          const activeUnits = (units.data ?? []).filter(
            (u) => u.class_id === c.id && u.status === "active",
          ).length;
          const recent = (lessons.data ?? []).find((l) => l.class_id === c.id);
          return (
            <Link
              key={c.id}
              to="/classes/$classId"
              params={{ classId: c.id }}
              className="surface-card flex flex-col gap-2 p-7 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="font-display text-2xl font-semibold">{c.name}</span>
              <span className="text-primary">{c.subject}</span>
              <span className="mt-2 text-sm text-muted-foreground">
                {activeUnits} aktive forløb
              </span>
              {recent && (
                <span className="truncate text-sm text-muted-foreground">
                  Senest: {recent.title}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <NewClassDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function NewClassDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createClass({ name, subject, school_year: year || null, notes: notes || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Klassen er oprettet");
      setName("");
      setSubject("");
      setYear("");
      setNotes("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ny klasse</DialogTitle>
          <DialogDescription>
            Opret et undervisningshold, fx 2.X i Psykologi. Du kan tilføje forløb og lektioner
            bagefter.
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
            <Label htmlFor="c-name">Klassenavn</Label>
            <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-subject">Fag</Label>
            <Input
              id="c-subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Psykologi"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-year">Skoleår</Label>
            <Input
              id="c-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025/2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-notes">Noter</Label>
            <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />} Opret klasse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
