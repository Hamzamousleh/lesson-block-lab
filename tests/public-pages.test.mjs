import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const routeFiles = {
  "/privacy": "src/routes/privacy.tsx",
  "/cookies": "src/routes/cookies.tsx",
  "/terms": "src/routes/terms.tsx",
  "/contact": "src/routes/contact.tsx",
  "/about": "src/routes/about.tsx",
};

test("all five information routes exist as public routes", () => {
  for (const [route, file] of Object.entries(routeFiles)) {
    assert.equal(fs.existsSync(new URL(`../${file}`, import.meta.url)), true, file);
    assert.match(read(file), new RegExp(`createFileRoute\\(\\"${route}\\"\\)`));
    assert.doesNotMatch(file, /_authenticated/);
  }
});

test("public footer links to every information route", () => {
  const footer = read("src/components/public/PublicLayout.tsx");
  for (const route of Object.keys(routeFiles))
    assert.match(footer, new RegExp(`to: \\"${route}\\"`));
  assert.match(read("src/routes/index.tsx"), /<PublicFooter \/>/);
});

test("auth and join surfaces expose privacy and terms links", () => {
  const auth = read("src/routes/auth.tsx");
  assert.match(auth, /to="\/terms"/);
  assert.match(auth, /to="\/privacy"/);
  assert.match(auth, /Ved brug af Didaktiva accepterer du/);
  assert.match(read("src/routes/join.index.tsx"), /to="\/privacy"/);
  assert.match(read("src/routes/join.$code.tsx"), /to="\/privacy"/);
});

test("contact and about internal links are real routes", () => {
  const contact = read("src/routes/contact.tsx");
  const about = read("src/routes/about.tsx");
  for (const route of ["/privacy", "/cookies", "/terms"]) {
    assert.match(contact, new RegExp(`to=\\"${route}\\"`));
    assert.match(about, new RegExp(`to=\\"${route}\\"`));
  }
  assert.match(about, /to="\/contact"/);
  assert.match(contact, /mailto:kontakt@didaktiva\.dk/);
});

test("public metadata uses the requested Didaktiva titles", () => {
  assert.match(read(routeFiles["/about"]), /Om Didaktiva \| Aktiv undervisning fra fagligt stof/);
  assert.match(read(routeFiles["/privacy"]), /Privatlivspolitik \| Didaktiva/);
  assert.match(read(routeFiles["/cookies"]), /Cookiepolitik \| Didaktiva/);
  assert.match(read(routeFiles["/terms"]), /Vilkår for brug \| Didaktiva/);
  assert.match(read(routeFiles["/contact"]), /Kontakt \| Didaktiva/);
});

test("public and legal surfaces contain no accidental CaseLab branding", () => {
  const publicSources = [
    "src/components/public/PublicLayout.tsx",
    ...Object.values(routeFiles),
    "src/routes/index.tsx",
    "src/routes/auth.tsx",
    "src/routes/join.index.tsx",
    "src/routes/join.$code.tsx",
  ]
    .map(read)
    .join("\n");
  assert.doesNotMatch(publicSources, /CaseLab/);
  assert.match(publicSources, /Didaktiva/);
});

test("internal CaseLab transport compatibility remains intact", () => {
  const transport = read("src/lib/caselab-package.ts");
  const types = read("src/lib/types.ts");
  assert.match(transport + types, /caselab_version/);
  assert.match(transport + types, /2\.0/);
});

const aboutScreenshots = [
  [
    "home-actions.jpg",
    "Didaktiva Hjem med genveje til Planlæg undervisning, Brug mit materiale, Red mig og Kør undervisning",
  ],
  [
    "home-continue.jpg",
    "Didaktiva Hjem med Fortsæt undervisningen, lektioner med Kør lektion og Redigér samt værktøjer",
  ],
  [
    "plan-chatgpt.jpg",
    "Planlæg med ChatGPT i Didaktiva med valg af hel lektion eller aktiviteter, klasse, forløb, emne og varighed",
  ],
  [
    "materialer.jpg",
    "Brug mit materiale i Didaktiva med materialeinput, klasse, materialetype, formål, varighed og uploadede filer",
  ],
  [
    "lesson-editor.jpg",
    "Didaktiva Lesson Editor med lektionstitel, læringsmål, varighed, Start elevsession og undervisningssekvens med blocks",
  ],
  [
    "live-session.jpg",
    "Didaktiva sessionstart med Start session, Åbn lærercockpit, join-kode, elevlink og antal deltagere",
  ],
  [
    "teacher-cockpit.jpg",
    "Teacher Cockpit med nuværende aktivitet, timer, det eleverne ser, progression, lærernote og næste aktivitet",
  ],
  [
    "elev-alias.jpg",
    "Elevens join-visning i Didaktiva med automatisk alias Gul Delfin og knappen Deltag",
  ],
  [
    "worlds.jpg",
    "Didaktiva Worlds med world-tilstand og variable som gruppepres, identitetskonflikt, belastning, konfliktniveau og psykologisk tryghed",
  ],
];

test("about contains no screenshot placeholders", () => {
  const about = read("src/routes/about.tsx");
  const placeholderComponent = ["Screenshot", "Placeholder"].join("");
  const placeholderCopy = ["Screenshot", "tilføjes", "før", "publicering"].join(" ");
  assert.equal(about.match(/<Row\b/g)?.length, 8);
  assert.doesNotMatch(about, new RegExp(`${placeholderComponent}|${placeholderCopy}`, "i"));
});

test("all local about screenshot assets exist and are referenced", () => {
  const about = read("src/routes/about.tsx");
  for (const [file] of aboutScreenshots) {
    const asset = new URL(`../public/images/about/${file}`, import.meta.url);
    assert.equal(fs.existsSync(asset), true, file);
    assert.ok(fs.statSync(asset).size > 0, file);
    assert.match(about, new RegExp(`/images/about/${file.replace(".", "\\.")}`));
  }
});

test("all about screenshots have concrete alt text and local sources", () => {
  const about = read("src/routes/about.tsx");
  for (const [, alt] of aboutScreenshots)
    assert.match(about, new RegExp(`alt=\"${alt}\"`));
  assert.doesNotMatch(about, /src=\"https?:\/\//);
  assert.match(about, /loading=\{priority \? \"eager\" : \"lazy\"\}/);
});


test("legal pages contain required dates and contact details", () => {
  const layout = read("src/components/public/PublicLayout.tsx");
  assert.match(layout, /19\. august 2026/);
  for (const file of [
    routeFiles["/privacy"],
    routeFiles["/cookies"],
    routeFiles["/terms"],
    routeFiles["/contact"],
  ]) {
    assert.match(read(file), /kontakt@didaktiva\.dk/);
  }
});
