import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classesQuery } from "@/lib/data";
import { buildMaterialPrompt } from "@/lib/prompt";
import { PromptResult } from "@/components/PromptResult";
import { MaterialPicker, selectedFileNames } from "@/components/materials/MaterialPicker";
import { materialFilesQuery } from "@/lib/materials";
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

export const Route = createFileRoute("/_authenticated/material-to-lesson")({
  head: () => ({
    meta: [
      { title: "Brug mit materiale — CaseLab" },
      {
        name: "description",
        content: "Omsæt dine egne noter, artikler eller uddrag til færdig undervisning.",
      },
      { property: "og:title", content: "Brug mit materiale — CaseLab" },
      { property: "og:description", content: "Fra tekst og noter til undervisning." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MaterialToLesson,
});

const KINDS = ["Noter", "Artikel", "Uddrag fra lærebog", "Kildetekst", "Andet"];
const PURPOSES = [
  "Introducere nyt stof",
  "Træne og anvende",
  "Repetition",
  "Diskussion og perspektivering",
  "Forberedelse til prøve",
];
const FEELS = ["Høj elevaktivitet", "Casebaseret", "Diskussionsdrevet", "Struktureret og roligt"];

function MaterialToLesson() {
  const classes = useQuery(classesQuery());
  const [classId, setClassId] = useState<string>("");
  const [material, setMaterial] = useState("");
  const [kind, setKind] = useState(KINDS[0] as string);
  const [purpose, setPurpose] = useState(PURPOSES[0] as string);
  const [duration, setDuration] = useState(90);
  const [outputType, setOutputType] = useState<"lesson" | "blocks" | "quiz">("lesson");
  const [feels, setFeels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [promptFiles, setPromptFiles] = useState<string[]>([]);
  const materials = useQuery(materialFilesQuery());
  const attachedFiles = selectedFileNames(materials.data ?? [], fileIds);

  const selected = useMemo(
    () => (classes.data ?? []).find((c) => c.id === classId),
    [classes.data, classId],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-display text-4xl font-semibold">Brug mit materiale</h1>
      <p className="mt-2 text-muted-foreground">
        Indsæt dine noter eller en tekst — eller vedhæft en uploadet fil — så laver ChatGPT
        undervisning ud fra netop dét.
      </p>

      <section className="surface-card mt-8 space-y-6 p-8">
        <div className="space-y-2">
          <Label htmlFor="material">Dit materiale</Label>
          <Textarea
            id="material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="Indsæt noter, artikel, uddrag …"
            className="min-h-56"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Klasse (valgfri)</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger aria-label="Klasse">
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
            <Label>Materialetype</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger aria-label="Materialetype">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formål</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger aria-label="Formål">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dur">Varighed (minutter)</Label>
            <Input
              id="dur"
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <MaterialPicker selectedIds={fileIds} onChange={setFileIds} context={{ classId }} />

        <div className="space-y-2">
          <Label>Hvad skal du bruge?</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { v: "lesson", label: "En hel lektion" },
                { v: "blocks", label: "Enkelte aktiviteter" },
                { v: "quiz", label: "Quiz / MCQ" },
              ] as const
            ).map((o) => (
              <Button
                key={o.v}
                type="button"
                variant={outputType === o.v ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setOutputType(o.v)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Karakter (valgfri)</Label>
          <div className="flex flex-wrap gap-2">
            {FEELS.map((f) => (
              <Button
                key={f}
                type="button"
                variant={feels.includes(f) ? "default" : "outline"}
                className="rounded-full"
                onClick={() =>
                  setFeels((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))
                }
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          className="rounded-full"
          disabled={material.trim().length < 40 && attachedFiles.length === 0}
          onClick={() => {
            setPromptFiles(attachedFiles);
            setPrompt(
              buildMaterialPrompt({
                className: selected?.name,
                subject: selected?.subject,
                material,
                materialKind: kind,
                purpose,
                duration,
                outputType,
                feels,
                attachedFiles,
              }),
            );
          }}
        >
          Lav prompt
        </Button>
        {material.trim().length < 40 && attachedFiles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Indsæt lidt mere tekst — eller vælg en uploadet fil — for at komme i gang.
          </p>
        )}
      </section>

      {prompt && <PromptResult prompt={prompt} attachedFiles={promptFiles} />}
    </div>
  );
}
