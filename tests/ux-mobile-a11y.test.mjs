import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { StudentProgressCoordinator } from "../src/lib/student-progress.ts";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const sourceFiles = [];
const walkSource = (directory) => {
  for (const entry of fs.readdirSync(new URL(`../${directory}/`, import.meta.url), {
    withFileTypes: true,
  })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) walkSource(relative);
    else if (entry.name.endsWith(".tsx")) sourceFiles.push(relative);
  }
};
walkSource("src");

test("mobile navigation exposes open/close and active-route semantics", () => {
  const source = read("src/components/AppShell.tsx");
  assert.match(source, /<Sheet open=\{menuOpen\} onOpenChange=\{setMenuOpen\}>/);
  assert.match(source, /aria-label="Åbn navigation"/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /onClick=\{\(\) => setMenuOpen\(false\)\}/);
  assert.match(source, /aria-current=/);
  assert.match(source, /TEACHER_NAVIGATION\.map/);
  assert.match(source, /min-h-11/);
});

test("source tree has no nested Link/Button controls", () => {
  for (const file of sourceFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /<Link[^>]*>\s*<Button/s, file);
    assert.doesNotMatch(source, /<a[^>]*>\s*<Button/s, file);
  }
});

test("failed student progress keeps the confirmed position", async () => {
  const states = [];
  let confirmedIndex = 0;
  const coordinator = new StudentProgressCoordinator((state) => states.push(state));
  const result = await coordinator.run(async () => {
    throw new Error("offline");
  });
  assert.equal(result, false);
  assert.equal(confirmedIndex, 0);
  assert.equal(states.at(-1).phase, "error");
});

test("student progress retry applies the server-confirmed position", async () => {
  let attempts = 0;
  let confirmedIndex = 0;
  const coordinator = new StudentProgressCoordinator(() => undefined);
  await coordinator.run(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("offline");
    confirmedIndex = 1;
  });
  assert.equal(await coordinator.retry(), true);
  assert.equal(attempts, 2);
  assert.equal(confirmedIndex, 1);
});

test("every Select trigger has a programmatic label", () => {
  for (const file of sourceFiles) {
    const source = read(file);
    for (const match of source.matchAll(/<SelectTrigger\b[^>]*>/gs)) {
      assert.match(match[0], /aria-(?:label|labelledby)=/, `${file}: ${match[0]}`);
    }
  }
});

test("editor keeps keyboard reorder buttons on mobile", () => {
  const source = read("src/routes/_authenticated/lessons.$lessonId.edit.tsx");
  assert.match(source, /aria-label=\{`Flyt "\$\{b\.title\}" op`\}/);
  assert.match(source, /aria-label=\{`Flyt "\$\{b\.title\}" ned`\}/);
  assert.match(source, /className="size-10 sm:size-8"/);
});

test("auth guard renders an accessible loading state", () => {
  const source = read("src/routes/_authenticated/route.tsx");
  assert.match(source, /if \(loading\)/);
  assert.match(source, /role="status"/);
  assert.match(source, /Henter din konto/);
  assert.match(source, /if \(!session\) return null/);
});

test("custom selected controls expose pressed state", () => {
  assert.match(
    read("src/routes/_authenticated/create-with-chatgpt.tsx"),
    /aria-pressed=\{active\}/,
  );
  assert.match(read("src/components/student/StudentBlock.tsx"), /aria-pressed=\{selected\}/);
  assert.match(
    read("src/components/session/StartSessionDialog.tsx"),
    /aria-pressed=\{mode === "live"\}/,
  );
});
