import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookmarkPlus, Download, Loader2 } from "lucide-react";
import { participantsQuery, responsesQuery, sessionQuery } from "@/lib/sessions";
import { blocksQuery, classesQuery, lessonQuery } from "@/lib/data";
import { blockDef } from "@/lib/blocks";
import {
  blockInsight,
  insightToText,
  questionOf,
  type TextResponseItem,
} from "@/lib/response-insight";
import { downloadCsv, responsesToCsv, saveResponseExamples } from "@/lib/response-export";
import { FOLLOW_UP_INTENTS, buildFollowUpPrompt, type FollowUpIntentId } from "@/lib/prompt";
import { PromptResult } from "@/components/PromptResult";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId_/follow-up")({
  head: () => ({
    meta: [
      { title: "Arbejd videre med svarene — CaseLab" },
      {
        name: "description",
        content: "Lav opfølgende aktiviteter ud fra elevernes faktiske svar i sessionen.",
      },
      { property: "og:title", content: "Arbejd videre med svarene — CaseLab" },
      { property: "og:description", content: "Fra elevsvar til næste aktivitet." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FollowUpPage,
});

function FollowUpPage() {
  const { sessionId } = Route.useParams();
  const session = useQuery(sessionQuery(sessionId));
  const lesson = useQuery({
    ...lessonQuery(session.data?.lesson_id ?? ""),
    enabled: !!session.data,
  });
  const blocks = useQuery({
    ...blocksQuery(session.data?.lesson_id ?? ""),
    enabled: !!session.data,
  });
  const participants = useQuery(participantsQuery(sessionId));
  const responses = useQuery(responsesQuery(sessionId));
  const classes = useQuery(classesQuery());

  const [blockId, setBlockId] = useState<string>("");
  const [intent, setIntent] = useState<FollowUpIntentId>("misconceptions");
  const [minutes, setMinutes] = useState(20);
  const [anonymized, setAnonymized] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string | null>(null);

  const list = (blocks.data ?? []).filter((b) => !b.is_fallback);
  const answered = list.filter((b) => (responses.data ?? []).some((r) => r.block_id === b.id));
  const active = answered.find((b) => b.id === blockId) ?? answered[0];

  const insight = useMemo(() => {
    if (!active) return null;
    return blockInsight(
      active,
      (responses.data ?? []).filter((r) => r.block_id === active.id),
      participants.data ?? [],
    );
  }, [active, responses.data, participants.data]);

  const textItems: TextResponseItem[] = insight?.kind === "text" ? insight.items : [];
  const chosenTexts = textItems.filter((t) => selected.includes(t.responseId));

  const summaryText = insight
    ? insightToText(insight, {
        includeText: chosenTexts.length ? chosenTexts : textItems.slice(0, 8),
        useNames: !anonymized,
      })
    : "";

  const klass = (classes.data ?? []).find(
    (c) => c.id === (session.data?.class_id ?? lesson.data?.class_id),
  );

  const bookmark = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error("Vælg en aktivitet.");
      await saveResponseExamples({
        block: active,
        lessonTitle: lesson.data?.title ?? null,
        subject: lesson.data?.subject ?? null,
        texts: chosenTexts.map((t) => t.text),
        tags: ["elevsvar"],
      });
    },
    onSuccess: () => toast.success("Svarene er gemt i biblioteket ✓"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (session.isLoading || !session.data) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-20 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter svar …
      </div>
    );
  }

  function generate() {
    if (!active || !insight) return;
    setPrompt(
      buildFollowUpPrompt({
        className: klass?.name,
        subject: lesson.data?.subject ?? undefined,
        lessonTitle: lesson.data?.title ?? "Lektion",
        learningGoal: lesson.data?.learning_goal,
        blockTitle: active.title,
        blockType: active.type,
        question: questionOf(active),
        responseSummary: summaryText,
        intent,
        minutes,
        anonymized,
      }),
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{lesson.data?.title ?? "Lektion"}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Arbejd videre med svarene</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            CaseLab opgør svarene. Du vælger, hvad der skal ske nu — og ser præcis hvilke data der
            sendes videre til ChatGPT.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              downloadCsv(
                `caselab-svar-${session.data?.join_code ?? "session"}.csv`,
                responsesToCsv({
                  responses: responses.data ?? [],
                  participants: participants.data ?? [],
                  blocks: list,
                  anonymized,
                }),
              )
            }
          >
            <Download className="size-4" /> Eksportér CSV
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/sessions/$sessionId" params={{ sessionId }}>
              Tilbage til sessionen
            </Link>
          </Button>
        </div>
      </div>

      {answered.length === 0 ? (
        <section className="surface-card mt-8 p-8">
          <p className="text-muted-foreground">
            Der er ingen elevsvar i denne session endnu. Start sessionen, og kom tilbage bagefter.
          </p>
        </section>
      ) : (
        <>
          <section className="surface-card mt-8 space-y-6 p-8">
            <div className="space-y-2">
              <Label>Hvilken aktivitet vil du arbejde videre med?</Label>
              <Select
                value={active?.id ?? ""}
                onValueChange={(v) => {
                  setBlockId(v);
                  setSelected([]);
                  setPrompt(null);
                }}
              >
                <SelectTrigger aria-label="Aktivitet" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {answered.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {blockDef(b.type).icon} {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Hvad skal der ske nu?</Label>
                <Select
                  value={intent}
                  onValueChange={(v) => {
                    setIntent(v as FollowUpIntentId);
                    setPrompt(null);
                  }}
                >
                  <SelectTrigger aria-label="Næste handling" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_INTENTS.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hvor lang tid har du?</Label>
                <Select
                  value={String(minutes)}
                  onValueChange={(v) => {
                    setMinutes(Number(v));
                    setPrompt(null);
                  }}
                >
                  <SelectTrigger aria-label="Tilgængelig tid" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 30, 45].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} minutter
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/50 px-5 py-4">
              <div>
                <p className="font-medium">Anonymiser elevsvar</p>
                <p className="text-sm text-muted-foreground">
                  Navne erstattes med Elev 1, Elev 2 … Anbefales.
                </p>
              </div>
              <Switch
                checked={anonymized}
                onCheckedChange={(v) => {
                  setAnonymized(v);
                  setPrompt(null);
                }}
              />
            </div>
          </section>

          {insight && (
            <section className="surface-card mt-6 space-y-4 p-8">
              <h2 className="text-xl font-semibold">Sådan svarede klassen</h2>
              {insight.kind === "options" && (
                <ul className="space-y-2">
                  {insight.labels.map((l, i) => (
                    <li key={i} className="rounded-xl bg-secondary/40 px-5 py-3">
                      <div className="flex justify-between gap-3">
                        <span>
                          {l}
                          {insight.correctIndex === i && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              korrekt
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {insight.counts[i] ?? 0} · {insight.percents[i] ?? 0}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {insight.kind === "scale" && (
                <p className="text-muted-foreground">
                  {insight.total} svar · gennemsnit {insight.average} · median {insight.median} ·
                  spænd {insight.min}–{insight.max}
                </p>
              )}
              {insight.kind === "ranking" && (
                <ul className="space-y-2">
                  {insight.items.map((it) => (
                    <li
                      key={it.label}
                      className="flex justify-between gap-3 rounded-xl bg-secondary/40 px-5 py-3"
                    >
                      <span>{it.label}</span>
                      <span className="text-muted-foreground">
                        gns. placering {it.averagePosition} · nr. 1 hos {it.firstPlaceCount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {insight.kind === "text" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Vælg de svar, du vil arbejde videre med. Vælger du ingen, bruges de første otte.
                  </p>
                  <ul className="space-y-2">
                    {insight.items.map((t) => {
                      const on = selected.includes(t.responseId);
                      return (
                        <li key={t.responseId}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelected((s) =>
                                on ? s.filter((x) => x !== t.responseId) : [...s, t.responseId],
                              )
                            }
                            className={`w-full rounded-xl border px-5 py-4 text-left transition-colors ${
                              on
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <p className="text-xs tracking-wide text-muted-foreground uppercase">
                              {anonymized ? t.alias : t.realName}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{t.text}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={!chosenTexts.length || bookmark.isPending}
                    onClick={() => bookmark.mutate()}
                  >
                    <BookmarkPlus className="size-4" /> Gem udvalgte svar i biblioteket
                  </Button>
                </div>
              )}
              {insight.kind === "none" && (
                <p className="text-muted-foreground">Ingen svar at opgøre for denne aktivitet.</p>
              )}
            </section>
          )}

          <section className="surface-card mt-6 space-y-4 p-8">
            <h2 className="text-xl font-semibold">Det her sendes videre</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-secondary/40 p-5">
                <p className="font-medium">Kontekst</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {[
                    klass ? `Klasse: ${klass.name}` : null,
                    lesson.data?.subject ? `Fag: ${lesson.data.subject}` : null,
                    `Lektion: ${lesson.data?.title ?? ""}`,
                    active ? `Aktivitet: ${active.title} (${active.type})` : null,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/40 p-5">
                <p className="font-medium">Opgjorte svar</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{summaryText}</p>
              </div>
              <p className="text-muted-foreground">
                Der sendes ingen elevnavne, når anonymisering er slået til.
              </p>
            </div>
            <Button className="rounded-full" onClick={generate}>
              Lav prompt
            </Button>
          </section>

          {prompt && (
            <PromptResult prompt={prompt} importSearch={{ lessonId: session.data.lesson_id }} />
          )}
        </>
      )}
    </div>
  );
}
