import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { csvCell } from "../src/lib/csv-safety.ts";
import {
  MAX_RESPONSE_PAYLOAD_BYTES,
  isSessionOwnershipValid,
  sanitizeStudentBlock,
  validateStudentResponse,
} from "../src/lib/session-security.ts";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const lessonA = "11111111-1111-4111-8111-111111111111";
const lessonB = "22222222-2222-4222-8222-222222222222";
const worldA = "33333333-3333-4333-8333-333333333333";
const worldB = "44444444-4444-4444-8444-444444444444";
const episodeA = "55555555-5555-4555-8555-555555555555";
const episodeB = "66666666-6666-4666-8666-666666666666";

function graph(overrides = {}) {
  return {
    session: { teacher_id: teacherA, lesson_id: lessonA, class_id: null, episode_id: null },
    lesson: { id: lessonA, teacher_id: teacherA },
    teacherClass: null,
    episode: null,
    world: null,
    ...overrides,
  };
}

test("Teacher A cannot use Teacher B's lesson", () => {
  assert.equal(
    isSessionOwnershipValid(graph({ lesson: { id: lessonB, teacher_id: teacherB } })),
    false,
  );
});

test("Teacher A cannot use Teacher B's World episode", () => {
  assert.equal(
    isSessionOwnershipValid(
      graph({
        session: { teacher_id: teacherA, lesson_id: lessonA, class_id: null, episode_id: episodeB },
        episode: { id: episodeB, teacher_id: teacherB, world_id: worldB, lesson_id: lessonB },
        world: { id: worldB, teacher_id: teacherB },
      }),
    ),
    false,
  );
});

test("Teacher A can use their own lesson and World episode", () => {
  assert.equal(
    isSessionOwnershipValid(
      graph({
        session: { teacher_id: teacherA, lesson_id: lessonA, class_id: null, episode_id: episodeA },
        episode: { id: episodeA, teacher_id: teacherA, world_id: worldA, lesson_id: lessonA },
        world: { id: worldA, teacher_id: teacherA },
      }),
    ),
    true,
  );
});

test("student block excludes teacher fields and hidden theory-test answers", () => {
  const student = sanitizeStudentBlock(
    {
      id: "block",
      type: "theory_test",
      title: "Test",
      duration_minutes: 5,
      student_instructions: null,
      teacher_notes: "secret",
      content: {
        question: "Q",
        options: ["A", "B"],
        correct_option_index: 1,
        feedback: { correct: "secret" },
      },
    },
    true,
  );
  assert.equal("teacher_notes" in student, false);
  assert.equal("correct_option_index" in student.content, false);
  assert.equal("feedback" in student.content, false);
});

test("invalid and oversized response payloads are rejected", () => {
  assert.throws(
    () => validateStudentResponse("poll", { options: ["A", "B"] }, { text: "wrong shape" }),
    /ugyldigt format/,
  );
  assert.throws(
    () =>
      validateStudentResponse(
        "short_response",
        {},
        {
          text: "x".repeat(MAX_RESPONSE_PAYLOAD_BYTES + 1),
        },
      ),
    /for stort/,
  );
});

test("representative legitimate response payloads are accepted", () => {
  assert.deepEqual(
    validateStudentResponse("poll", { options: ["A", "B"] }, { selected_option_index: 1 }),
    { selected_option_index: 1 },
  );
  assert.deepEqual(validateStudentResponse("scale", { min: 1, max: 7 }, { value: 4 }), {
    value: 4,
  });
  assert.deepEqual(validateStudentResponse("short_response", {}, { text: "Mit svar" }), {
    text: "Mit svar",
  });
  assert.deepEqual(
    validateStudentResponse("ranking", { items: ["A", "B"] }, { ordered_items: ["B", "A"] }),
    { ordered_items: ["B", "A"] },
  );
});

test("CSV cells neutralize spreadsheet formula prefixes", () => {
  for (const value of ["=SUM(A1:A2)", "+1+1", "-2+3", "@IMPORT"]) {
    assert.equal(csvCell(value).startsWith("\"'"), true, value);
  }
  assert.equal(csvCell('almindelig "tekst"'), '"almindelig ""tekst"""');
});

test("migration contains both trigger and RLS parent invariants", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260815030000_session_tenant_isolation.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /CREATE TRIGGER sessions_validate_parent_ownership/);
  assert.match(sql, /episode\.lesson_id = NEW\.lesson_id/);
  assert.match(sql, /episode\.lesson_id = sessions\.lesson_id/);
  assert.match(sql, /block\.lesson_id = NEW\.lesson_id/);
});
