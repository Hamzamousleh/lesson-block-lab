import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  isNavigationGroupActive,
  isNavigationItemActive,
  TEACHER_NAVIGATION,
} from "../src/lib/teacher-navigation.ts";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("teacher navigation renders the intended groups", () => {
  assert.deepEqual(
    TEACHER_NAVIGATION.map((entry) => entry.label),
    ["Hjem", "Undervisning", "Ressourcer", "Live", "Worlds"],
  );
  const groups = Object.fromEntries(
    TEACHER_NAVIGATION.filter((entry) => entry.kind === "group").map((entry) => [
      entry.label,
      entry.items.map((item) => item.label),
    ]),
  );
  assert.deepEqual(groups.Undervisning, ["Klasser", "Forløb", "Lektioner"]);
  assert.deepEqual(groups.Ressourcer, ["Materialer", "Bibliotek"]);
  assert.deepEqual(groups.Live, ["Sessioner"]);
});

test("mobile drawer keeps open, close, and grouped navigation behavior", () => {
  const source = read("src/components/AppShell.tsx");
  assert.match(source, /<Sheet open=\{menuOpen\} onOpenChange=\{setMenuOpen\}>/);
  assert.match(source, /onClick=\{\(\) => setMenuOpen\(false\)\}/);
  assert.match(source, /TEACHER_NAVIGATION\.map/);
  assert.match(source, /aria-label="Mobilnavigation"/);
});

test("active navigation covers index pages and deep routes", () => {
  assert.equal(isNavigationItemActive("/lessons", "/lessons"), true);
  assert.equal(isNavigationItemActive("/lessons/lesson-1/edit", "/lessons"), true);
  assert.equal(isNavigationItemActive("/materials", "/library"), false);
  assert.equal(
    isNavigationGroupActive("/classes/class-1", [
      { to: "/classes" },
      { to: "/units" },
      { to: "/lessons" },
    ]),
    true,
  );
});

test("existing teacher deep-link routes remain declared", () => {
  const expected = [
    ["src/routes/_authenticated/classes.$classId.tsx", "/_authenticated/classes/$classId"],
    [
      "src/routes/_authenticated/lessons.$lessonId.edit.tsx",
      "/_authenticated/lessons/$lessonId/edit",
    ],
    ["src/routes/_authenticated/sessions.$sessionId.tsx", "/_authenticated/sessions/$sessionId"],
    ["src/routes/_authenticated/worlds.$worldId.tsx", "/_authenticated/worlds/$worldId"],
  ];
  for (const [file, route] of expected)
    assert.ok(read(file).includes(route), `${route} is missing`);
});

test("home empty state exposes one primary next action", () => {
  const source = read("src/routes/_authenticated/home.tsx");
  const emptyState = source.slice(
    source.indexOf("lessons.data?.length === 0"),
    source.indexOf("lessons.data?.map"),
  );
  assert.equal(emptyState.match(/<Link\b/g)?.length, 1);
  assert.match(emptyState, /Planlæg din første lektion/);
  assert.doesNotMatch(emptyState, /Indlæs demo/);
});

test("lesson cards expose the teacher-goal CTA", () => {
  assert.match(read("src/routes/_authenticated/lessons.index.tsx"), />\s*Kør lektion\s*</);
  assert.match(read("src/routes/_authenticated/home.tsx"), /> Kør lektion/);
  assert.match(read("src/routes/_authenticated/classes.$classId.tsx"), /> Kør lektion/);
});

test("materials and library explain distinct mental models", () => {
  const materials = read("src/routes/_authenticated/materials.tsx");
  const library = read("src/routes/_authenticated/library.tsx");
  assert.match(materials, /Dine egne filer og kilder/);
  assert.match(materials, /læser eller\s+sender ikke filen automatisk/);
  assert.match(library, /Gemte undervisningselementer, du kan genbruge/);
  assert.match(library, /Dine filer ligger under Materialer/);
});

test("ChatGPT flows use teacher-facing primary wording", () => {
  const files = [
    "src/routes/_authenticated/create-with-chatgpt.tsx",
    "src/routes/_authenticated/material-to-lesson.tsx",
    "src/routes/_authenticated/rescue.tsx",
    "src/routes/_authenticated/extra-time.tsx",
    "src/routes/_authenticated/improve-lesson.tsx",
    "src/routes/_authenticated/differentiate.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /Klargør til ChatGPT/, file);
    assert.doesNotMatch(source, />\s*Lav (?:ChatGPT-)?prompt/, file);
  }
  assert.match(read("src/components/PromptResult.tsx"), /Kopiér til ChatGPT/);
  assert.match(read("src/routes/_authenticated/import.tsx"), /Svar fra ChatGPT/);
});

test("class, unit, lesson, and session hierarchy is explained", () => {
  assert.match(
    read("src/routes/_authenticated/classes.index.tsx"),
    /En klasse er dit undervisningshold/,
  );
  assert.match(read("src/routes/_authenticated/units.tsx"), /Et forløb er et fagligt tema/);
  assert.match(
    read("src/routes/_authenticated/lessons.index.tsx"),
    /En lektion er en konkret undervisningsgang/,
  );
  assert.match(
    read("src/routes/_authenticated/sessions.index.tsx"),
    /En session er en konkret gennemførsel/,
  );
});
