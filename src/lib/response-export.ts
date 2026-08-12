import { supabase } from "@/integrations/supabase/client";
import type { LessonBlock } from "./types";
import type { SessionParticipant, SessionResponse } from "./sessions";
import { aliasMap, nameMap, questionOf } from "./response-insight";

function cell(value: string): string {
  const v = value.replace(/\r?\n/g, " ").trim();
  return `"${v.replace(/"/g, '""')}"`;
}

function answerText(data: Record<string, unknown>, block?: LessonBlock): string {
  const parts: string[] = [];
  const sel = data["selected_option_index"];
  if (typeof sel === "number") {
    const options = block?.content?.["options"];
    const label = Array.isArray(options) ? String(options[sel] ?? "") : "";
    parts.push(label ? `${sel + 1}. ${label}` : String(sel + 1));
  }
  if (typeof data["value"] === "number") parts.push(String(data["value"]));
  if (typeof data["text"] === "string" && data["text"].trim()) parts.push(data["text"].trim());
  if (Array.isArray(data["answers"]))
    parts.push((data["answers"] as unknown[]).map(String).filter(Boolean).join(" | "));
  if (Array.isArray(data["ordered_items"]))
    parts.push((data["ordered_items"] as unknown[]).map(String).join(" → "));
  if (typeof data["justification"] === "string" && data["justification"].trim())
    parts.push(`Begrundelse: ${data["justification"].trim()}`);
  return parts.join(" — ");
}

export function responsesToCsv(input: {
  responses: SessionResponse[];
  participants: SessionParticipant[];
  blocks: LessonBlock[];
  anonymized: boolean;
}): string {
  const names = nameMap(input.participants);
  const aliases = aliasMap(input.participants);
  const blockById = new Map(input.blocks.map((b) => [b.id, b]));
  const header = ["Elev", "Aktivitet", "Type", "Spørgsmål", "Svar", "Tidspunkt"].map(cell).join(",");
  const rows = input.responses.map((r) => {
    const block = blockById.get(r.block_id);
    const who = input.anonymized
      ? (aliases.get(r.participant_id) ?? "Elev")
      : (names.get(r.participant_id) ?? "Ukendt");
    return [
      who,
      block?.title ?? "",
      block?.type ?? r.response_type,
      block ? questionOf(block) : "",
      answerText(r.response_data ?? {}, block),
      new Date(r.submitted_at).toLocaleString("da-DK"),
    ]
      .map(cell)
      .join(",");
  });
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- bookmark responses as library examples ---------------- */

export interface ResponseExampleData {
  block_type: string;
  block_title: string;
  question: string;
  lesson_title: string | null;
  examples: string[];
  captured_at: string;
}

export async function saveResponseExamples(input: {
  block: Pick<LessonBlock, "type" | "title" | "content">;
  lessonTitle?: string | null;
  subject?: string | null;
  texts: string[];
  title?: string;
  tags?: string[];
}): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Du er ikke logget ind.");
  if (!input.texts.length) throw new Error("Vælg mindst ét svar.");

  const payload: ResponseExampleData = {
    block_type: input.block.type,
    block_title: input.block.title,
    question: questionOf(input.block),
    lesson_title: input.lessonTitle ?? null,
    examples: input.texts,
    captured_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("library_items").insert({
    teacher_id: auth.user.id,
    item_type: "response_example" as never,
    title: (input.title ?? `Elevsvar · ${input.block.title}`).trim(),
    subject: input.subject ?? null,
    block_type: input.block.type,
    duration_minutes: 0,
    tags: input.tags ?? [],
    data: payload as never,
  } as never);
  if (error) throw new Error("Svarene kunne ikke gemmes i biblioteket.");
}
