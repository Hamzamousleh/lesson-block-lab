import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  assertIsolatedTestEnvironment,
  parseEnv,
  projectRefFromUrl,
  REQUIRED_CONFIRMATION,
} from "../scripts/pilot/env.mjs";
import { ALL_WORLD_A_CONSEQUENCES, IDS, teacherFixtures } from "../scripts/pilot/fixtures.mjs";

const valid = {
  TEST_ENV: "true",
  TEST_ALLOW_DESTRUCTIVE_FIXTURES: REQUIRED_CONFIRMATION,
  TEST_SUPABASE_URL: "https://isolatedtestref.supabase.co",
  TEST_SUPABASE_PROJECT_REF: "isolatedtestref",
  TEST_SUPABASE_ANON_KEY: "test-anon",
  TEST_SUPABASE_SERVICE_ROLE_KEY: "test-service",
  TEST_TEACHER_A_EMAIL: "didaktiva.test.teacher.a@example.invalid",
  TEST_TEACHER_A_PASSWORD: "not-a-real-secret-a",
  TEST_TEACHER_B_EMAIL: "didaktiva.test.teacher.b@example.invalid",
  TEST_TEACHER_B_PASSWORD: "not-a-real-secret-b",
  PRODUCTION_SUPABASE_PROJECT_REF: "productionref",
};

test("environment parser does not require dotenv", () => {
  assert.deepEqual(parseEnv('A=one\n# comment\nB="two"\n'), { A: "one", B: "two" });
});

test("project ref is derived only from a Supabase hostname", () => {
  assert.equal(projectRefFromUrl("https://isolatedtestref.supabase.co"), "isolatedtestref");
  assert.equal(projectRefFromUrl("https://example.com"), null);
});

test("valid dedicated test configuration passes", () => {
  assert.equal(
    assertIsolatedTestEnvironment(valid, ["anotherprod"]).testProjectRef,
    "isolatedtestref",
  );
});

test("missing explicit test marker aborts", () => {
  assert.throws(() => assertIsolatedTestEnvironment({ ...valid, TEST_ENV: "false" }), /ABORT/);
});

test("missing destructive-fixture confirmation aborts", () => {
  assert.throws(
    () => assertIsolatedTestEnvironment({ ...valid, TEST_ALLOW_DESTRUCTIVE_FIXTURES: "no" }),
    /ABORT/,
  );
});

test("URL/project-ref mismatch aborts", () => {
  assert.throws(
    () => assertIsolatedTestEnvironment({ ...valid, TEST_SUPABASE_PROJECT_REF: "different" }),
    /ABORT/,
  );
});

test("production or app project ref aborts", () => {
  assert.throws(
    () =>
      assertIsolatedTestEnvironment({
        ...valid,
        PRODUCTION_SUPABASE_PROJECT_REF: "isolatedtestref",
      }),
    /production/,
  );
  assert.throws(() => assertIsolatedTestEnvironment(valid, ["isolatedtestref"]), /production/);
});

test("service role with VITE prefix aborts", () => {
  assert.throws(
    () => assertIsolatedTestEnvironment({ ...valid, VITE_SUPABASE_SERVICE_ROLE_KEY: "bad" }),
    /VITE/,
  );
});

test("test tenants must be distinct and namespaced", () => {
  assert.throws(
    () =>
      assertIsolatedTestEnvironment({ ...valid, TEST_TEACHER_B_EMAIL: valid.TEST_TEACHER_A_EMAIL }),
    /different/,
  );
  assert.throws(
    () =>
      assertIsolatedTestEnvironment({ ...valid, TEST_TEACHER_A_EMAIL: "teacher@example.invalid" }),
    /namespaced/,
  );
});

test("fixtures use stable IDs and explicit TEST labels", () => {
  const fixtures = teacherFixtures(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  );
  assert.equal(new Set(Object.values(IDS)).size, Object.values(IDS).length);
  assert.equal(ALL_WORLD_A_CONSEQUENCES.length, 7);
  assert.ok(fixtures.classes.every((row) => row.name.startsWith("[TEST]")));
  assert.ok(fixtures.lessons.every((row) => row.title.startsWith("[TEST]")));
  assert.ok(fixtures.worlds.every((row) => row.title.startsWith("[TEST]")));
  assert.deepEqual(
    fixtures.blocks.map((row) => row.type),
    ["poll", "short_response", "theory_test", "exit_ticket"],
  );
});

test("cleanup is scoped by exact fixture ID and teacher ownership", () => {
  const source = fs.readFileSync(new URL("../scripts/pilot/database.mjs", import.meta.url), "utf8");
  assert.match(source, /\.eq\("teacher_id", teacherId\)\.eq\("id", worldId\)/);
  assert.match(source, /\.eq\("teacher_id", teacherIds\.teacherA\)/);
  assert.doesNotMatch(source, /\.like\(|\.ilike\(/);
});
