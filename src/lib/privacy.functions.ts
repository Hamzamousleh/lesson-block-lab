import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const exportTables = [
  "profiles",
  "classes",
  "units",
  "lessons",
  "lesson_blocks",
  "sessions",
  "library_items",
  "material_files",
  "class_insight_notes",
  "worlds",
  "world_episodes",
  "world_state",
  "world_consequences",
  "world_events",
] as const;

export const downloadMyDataFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const entries = await Promise.all(
      exportTables.map(async (table) => {
        const { data, error } = await context.supabase.from(table).select("*");
        if (error) throw new Error(`Dine data fra ${table} kunne ikke eksporteres.`);
        return [table, data ?? []] as const;
      }),
    );

    return {
      export_version: "1.0",
      generated_at: new Date().toISOString(),
      teacher_id: context.userId,
      student_responses_included: false,
      data: Object.fromEntries(entries),
    };
  });

export const deleteMyAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ confirmation: z.literal("SLET") }).parse(input))
  .handler(async ({ context }) => {
    // Read paths through the caller's RLS-scoped client. The client never chooses a user id.
    const { data: files, error: fileError } = await context.supabase
      .from("material_files")
      .select("storage_path");
    if (fileError) throw new Error("Dine materialefiler kunne ikke kontrolleres.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pathSet = new Set((files ?? []).map((file) => file.storage_path));

    // Also enumerate the teacher-owned folder so a historical orphan without
    // metadata cannot survive account deletion.
    for (let offset = 0; ; offset += 100) {
      const { data: objects, error: listError } = await supabaseAdmin.storage
        .from("material-files")
        .list(context.userId, { limit: 100, offset });
      if (listError) {
        throw new Error(
          "Materialefilerne kunne ikke kontrolleres. Kontoen er ikke blevet slettet.",
        );
      }
      for (const object of objects ?? []) pathSet.add(`${context.userId}/${object.name}`);
      if (!objects || objects.length < 100) break;
    }

    const paths = [...pathSet];
    for (let start = 0; start < paths.length; start += 100) {
      const { error } = await supabaseAdmin.storage
        .from("material-files")
        .remove(paths.slice(start, start + 100));
      if (error) {
        // Keep auth and database rows intact so the teacher can retry safely.
        throw new Error("Materialefilerne kunne ikke slettes. Kontoen er ikke blevet slettet.");
      }
    }

    // Every teacher-owned table has auth.users ON DELETE CASCADE directly or through
    // its parent. Auth is deleted last, after storage cleanup succeeded.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (deleteError) throw new Error("Kontoen kunne ikke slettes. Prøv igen.");

    return { deleted: true as const };
  });
