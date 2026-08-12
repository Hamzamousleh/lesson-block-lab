import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";
import { classesQuery } from "@/lib/data";
import { buildWorldPrompt } from "@/lib/prompt";
import { WORLD_TEMPLATES, templateFor } from "@/lib/world-templates";
import { createWorld, WORLD_TYPE_LABEL, type StateDraft, type WorldType } from "@/lib/worlds";
import { validateWorldPackage } from "@/lib/world-package";
import { importWorldPackage } from "@/lib/world-import";
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

export const Route = createFileRoute("/_authenticated/worlds/new")({
  head: () => ({
    meta: [
      { title: "Nyt World — CaseLab" },
      { name: "description", content: "Opret et vedvarende læringsunivers med faglige variabler og episoder." },
      { property: "og:title", content: "Nyt World — CaseLab" },
      { property: "og:description", content: "Byg et World med faglige variabler, episoder og konsekvenser." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewWorldPage,
});

const NO_CLASS = "__none__";

function NewWorldPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const classes = useQuery(classesQuery());

  const [templateKey, setTemplateKey] = useState("psychology_people");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classId, setClassId] = useState(NO_CLASS);
  const [focus, setFocus] = useState("");
  const [premise, setPremise] = useState("");
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const template = templateFor(templateKey);
  const state: StateDraft[] = template?.state ?? [];
  const effectiveSubject = subject || template?.subject || "";

  const prompt = buildWorldPrompt({
    title: title || "Mit World",
    subject: effectiveSubject || "Fag",
    worldTypeLabel: WORLD_TYPE_LABEL[(template?.world_type ?? "other") as WorldType],
    academicFocus: focus || "Anvendelse af fagets kernebegreber",
    premiseIdea: premise,
    className: classId === NO_CLASS ? undefined : classes.data?.find((c) => c.id === classId)?.name,
  });

  const createFromTemplate = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Giv dit World en titel.");
      if (!effectiveSubject.trim()) throw new Error("Vælg et fag.");
      if (!premise.trim()) throw new Error("Beskriv grundsituationen — hvem eller hvad møder eleverne?");
      return createWorld({
        title: title.trim(),
        subject: effectiveSubject.trim(),
        class_id: classId === NO_CLASS ? null : classId,
        premise: premise.trim(),
        world_type: template?.world_type ?? "other",
        academic_focus: focus.trim() || null,
        state,
      });
    },
    onSuccess: async (world) => {
      await queryClient.invalidateQueries({ queryKey: ["worlds"] });
      toast.success("Dit World er oprettet.");
      navigate({ to: "/worlds/$worldId", params: { worldId: world.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importPackage = useMutation({
    mutationFn: async () => {
      const result = validateWorldPackage(pasted);
      if (!result.ok || !result.data) {
        setErrors(result.errors);
        throw new Error("Pakken kunne ikke godkendes.");
      }
      if (result.data.package_type !== "world") {
        setErrors(["Dette er en episode-pakke. Importér den inde i et eksisterende World."]);
        throw new Error("Forkert pakketype.");
      }
      setErrors([]);
      return importWorldPackage(result.data, { classId: classId === NO_CLASS ? null : classId });
    },
    onSuccess: async (world) => {
      await queryClient.invalidateQueries({ queryKey: ["worlds"] });
      toast.success("Dit World er importeret.");
      navigate({ to: "/worlds/$worldId", params: { worldId: world.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompten er kopieret ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunne ikke kopiere automatisk. Markér teksten og kopiér manuelt.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold">Nyt World</h1>
      <p className="mt-2 text-muted-foreground">
        Et World er en ramme, ikke et spil. Eleverne møder de samme personer eller institutioner igen
        og igen og anvender fagteori på nye situationer.
      </p>

      <section className="surface-card mt-8 space-y-5 p-8">
        <h2 className="text-xl font-semibold">1 · Grundlaget</h2>

        <div className="space-y-2">
          <Label>Udgangspunkt</Label>
          <Select value={templateKey} onValueChange={setTemplateKey}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORLD_TEMPLATES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {template && <p className="text-sm text-muted-foreground">{template.description}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="w-title">Titel</Label>
            <Input
              id="w-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={template?.example.split(" — ")[0] ?? "Fx Nordania"}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-subject">Fag</Label>
            <Input
              id="w-subject"
              value={effectiveSubject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Klasse (valgfri)</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Ingen klasse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLASS}>Ingen klasse</SelectItem>
              {(classes.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="w-focus">Fagligt fokus</Label>
          <Input
            id="w-focus"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Fx socialpsykologi, gruppedynamik og identitet"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="w-premise">Grundsituation</Label>
          <Textarea
            id="w-premise"
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="Hvem eller hvad møder eleverne igen og igen?"
            className="min-h-28 rounded-xl"
          />
        </div>

        {state.length > 0 && (
          <div className="rounded-xl bg-secondary/50 p-4">
            <p className="text-sm font-medium">World-variabler i skabelonen</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {state.map((s) => (
                <li key={s.state_key}>
                  {s.label} — start {String(s.value)}
                  {s.student_visible === false ? " (kun læreren)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="rounded-full"
          onClick={() => createFromTemplate.mutate()}
          disabled={createFromTemplate.isPending}
        >
          {createFromTemplate.isPending && <Loader2 className="size-4 animate-spin" />} Opret World
        </Button>
      </section>

      <section className="surface-card mt-6 space-y-4 p-8">
        <h2 className="text-xl font-semibold">2 · Eller byg det med ChatGPT</h2>
        <p className="text-sm text-muted-foreground">
          Kopiér prompten, kør den i ChatGPT, og indsæt JSON-svaret nedenfor.
        </p>
        <Textarea readOnly value={prompt} className="min-h-48 rounded-xl font-mono text-xs" />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => void copyPrompt()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Kopiér prompt
          </Button>
          <a href="https://chatgpt.com" target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-full">
              Åbn ChatGPT
            </Button>
          </a>
        </div>

        <Textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Indsæt World-pakken (JSON) her …"
          className="min-h-40 rounded-xl font-mono text-xs"
        />
        {errors.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <Button
          className="rounded-full"
          onClick={() => importPackage.mutate()}
          disabled={importPackage.isPending || !pasted.trim()}
        >
          {importPackage.isPending && <Loader2 className="size-4 animate-spin" />} Importér World
        </Button>
      </section>
    </div>
  );
}
