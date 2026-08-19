import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  generateStudentAlias,
  isGeneratedStudentAlias,
  privacySafeStudentAlias,
} from "../src/lib/student-alias.ts";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260819030000_privacy_readiness.sql");
const joinRoute = read("src/routes/join.$code.tsx");
const joinServer = read("src/lib/session.server.ts");
const accountServer = read("src/lib/privacy.functions.ts");

test("first join receives a neutral generated alias", () => {
  assert.equal(
    generateStudentAlias([], () => 0),
    "Blå Falk",
  );
  assert.ok(generateStudentAlias([], () => 0.5).trim());
});

test("alias generation avoids a name already used in the session", () => {
  assert.notEqual(
    generateStudentAlias(["Blå Falk"], () => 0),
    "Blå Falk",
  );
});

test("persisted neutral aliases are not anonymized twice", () => {
  assert.equal(isGeneratedStudentAlias("Blå Falk"), true);
  assert.equal(isGeneratedStudentAlias("Elevens fulde navn"), false);
  assert.equal(privacySafeStudentAlias("Blå Falk", 0), "Blå Falk");
  assert.equal(privacySafeStudentAlias("Elevens fulde navn", 1), "Elev 2");
});

test("join UI has no free student-name input", () => {
  assert.doesNotMatch(joinRoute, /student-name|placeholder="Dit navn"/);
  assert.match(joinRoute, /automatisk alias/);
  assert.match(joinRoute, /Du behøver ikke oprette en konto eller skrive dit/);
});

test("rejoin preserves the participant and alias unless rotation is requested", () => {
  const existingBranch = joinServer.slice(
    joinServer.indexOf("if (input.participant_token)"),
    joinServer.indexOf("const participant_token = token()"),
  );
  assert.match(existingBranch, /if \(input\.rotate_alias\)/);
  assert.match(existingBranch, /let displayName = existing\.display_name/);
  assert.doesNotMatch(existingBranch, /\.insert\(/);
});

test("refresh and same-session rejoin reuse the session-scoped token", () => {
  assert.match(joinRoute, /readToken\(code\)/);
  assert.match(joinRoute, /saveToken\(code, res\.participant_token\)/);
  assert.match(read("src/lib/participant.ts"), /PREFIX \+ code\.toUpperCase\(\)/);
});

test("new alias rotates the name without creating a participant", () => {
  assert.match(joinRoute, /Nyt alias/);
  assert.match(joinRoute, /join\.mutate\(true\)/);
  assert.match(joinServer, /\.update\(\{ display_name: displayName, last_seen_at:/);
});

test("retention preserves recent sessions and deletes only expired participant data", () => {
  assert.match(migration, /now\(\) - interval '90 days'/);
  assert.match(migration, /s\.ended_at IS NOT NULL AND s\.ended_at < v_cutoff/);
  assert.match(migration, /sp\.last_seen_at < v_cutoff/);
  assert.match(migration, /DELETE FROM public\.session_participants/);
  assert.doesNotMatch(migration, /DELETE FROM public\.lessons/);
  assert.doesNotMatch(migration, /DELETE FROM public\.sessions/);
});

test("retention cleanup is idempotent and not executable by browser roles", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.cleanup_expired_student_data/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.cleanup_expired_student_data\(\) FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.cleanup_expired_student_data\(\) TO service_role/,
  );
});

test("manual student-data deletion is authenticated and teacher-scoped", () => {
  assert.match(migration, /v_teacher_id uuid := auth\.uid\(\)/);
  assert.match(migration, /v_owner_id <> v_teacher_id/);
  assert.match(migration, /Only ended sessions can have student data deleted/);
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.delete_session_student_data\(uuid\) TO authenticated/,
  );
  assert.match(migration, /Responses are removed by the participant FK cascade/);
});

test("account deletion authenticates the caller and never accepts a user id", () => {
  assert.match(accountServer, /middleware\(\[requireSupabaseAuth\]\)/);
  assert.match(accountServer, /z\.literal\("SLET"\)/);
  assert.doesNotMatch(accountServer, /user_id:|p_user_id|input\.user/);
  assert.match(accountServer, /deleteUser\(context\.userId\)/);
});

test("storage cleanup finishes before auth deletion", () => {
  const storage = accountServer.indexOf('.from("material-files")');
  const auth = accountServer.indexOf("auth.admin.deleteUser");
  assert.ok(storage >= 0 && auth > storage);
  assert.match(accountServer, /\.list\(context\.userId/);
  assert.match(accountServer, /Kontoen er ikke blevet slettet/);
});

test("account success clears private local state and signs out locally", () => {
  const dialog = read("src/components/AccountPrivacyDialog.tsx");
  assert.match(dialog, /clearPrivateLocalStorage\(\)/);
  assert.match(dialog, /signOut\(\{ scope: "local" \}\)/);
  assert.match(read("src/lib/participant.ts"), /caselab-run-start-|caselab-timer-/);
});

test("response examples persist no participant name and retain source/date", () => {
  const source = read("src/lib/response-export.ts");
  assert.match(source, /source_session_id/);
  assert.match(source, /captured_at/);
  assert.doesNotMatch(source, /display_name/);
});

test("class insight notes remain owner-only", () => {
  const sql = read("supabase/migrations/20260812105131_3e211a1c-dac1-4407-b8a7-f1ddc683b493.sql");
  assert.match(sql, /auth\.uid\(\) = teacher_id/);
  assert.match(sql, /teacher_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
});

test("fonts are bundled locally and Google font hosts are absent", () => {
  const root = read("src/routes/__root.tsx");
  const styles = read("src/styles.css");
  assert.doesNotMatch(root + styles, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(styles, /@fontsource-variable\/fraunces/);
  assert.match(styles, /@fontsource-variable\/plus-jakarta-sans/);
});

test("privacy pass adds no analytics or runtime AI SDK", () => {
  const pkg = read("package.json");
  assert.doesNotMatch(pkg, /posthog|hotjar|clarity|segment|@sentry|openai/i);
  const changedRuntime = [joinRoute, joinServer, accountServer].join("\n");
  assert.doesNotMatch(changedRuntime, /api\.openai\.com|lovable.*ai|analytics|gtag/i);
});
