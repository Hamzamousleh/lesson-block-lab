import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { classesQuery, createLesson, unitsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/lessons/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    classId: typeof search['classId'] === "string" ? (search['classId'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ny lektion — CaseLab" },
      { name: "description", content: "Opret en ny lektion og byg den op af aktiviteter." },
      { property: "og:title", content: "Ny lektion — CaseLab" },
      { property: "og:description", content: "Opret en ny lektion og byg den op af aktiviteter." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewLesson,
});

function NewLesson() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const classes = useQuery(classesQuery());
  const [classId, setClassId] = useState<string>(search.classId ?? "");
  const units = useQuery({ ...unitsQuery(classId || undefined), enabled: !!classId });

  const [title, setTitle] = useState("");
  const [unitId, setUnitId] = useState("none");
  const [duration, setDuration] = useState(90);
  const [goal, setGoal] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const klass = (classes.data ?? []).find((c) => c.id === classId);
      return createLesson({
        class_id: classId,
        unit_id: unitId === "none" ? null : unitId,
        title,
        subject: klass?.subject ?? null,
        duration_minutes: duration,
        learning_goal: goal || null,
      });
    },
    onSuccess: (lesson) => {
      toast.success("Lektionen er oprettet");
      navigate({ to: "/lessons/$lessonId/edit", params: { lessonId: lesson.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noClasses = classes.data?.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-semibold">Ny lektion</h1>
      <p className="mt-2 text-muted-foreground">
        Sæt rammen — aktiviteterne bygger du i editoren bagefter.
      </p>

      {noClasses ? (
        <div className="surface-card mt-10 p-8 text-center">
          <p className="text-lg font-medium">Du skal først oprette en klasse</p>
          <Button className="mt-5 rounded-full" onClick={() => navigate({ to: "/classes" })}>
            Gå til klasser
          </Button>
        </div>
      ) : (
        <form
          className="surface-card mt-10 space-y-6 p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!classId) {
              toast.error("Vælg en klasse");
              return;
            }
            if (!create.isPending) create.mutate();
          }}

        >
          <div className="space-y-2">
            <Label htmlFor="l-title">Titel</Label>
            <Input
              id="l-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Konformitet og gruppepres"
            />
          </div>

          <div className="space-y-2">
            <Label>Klasse</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg klasse" />
              </SelectTrigger>
              <SelectContent>
                {classes.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Forløb</Label>
            <Select value={unitId} onValueChange={setUnitId} disabled={!classId}>
              <SelectTrigger>
                <SelectValue placeholder="Uden forløb" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uden forløb</SelectItem>
                {units.data?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="l-duration">Varighed (minutter)</Label>
            <Input
              id="l-duration"
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="l-goal">Læringsmål</Label>
            <Textarea
              id="l-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Eleverne kan …"
            />
          </div>

          <Button type="submit" className="w-full rounded-full" disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Opret lektion
          </Button>
        </form>
      )}
    </div>
  );
}
