# Teacher's Studio

Build a new full-stack web application called CaseLab.

IMPORTANT:

This is a fresh V2 product.

Do not build a World simulation platform.

Do not build student live sessions.

Do not add AI API integrations.

Do not build every feature described in the long-term product vision.

For this first implementation, build ONLY the strong product foundation described under:

PHASE 1 — FOUNDATION.

However, understand the full product philosophy first so that the architecture supports future expansion.

==================================================

PRODUCT VISION

==================================================

CaseLab is a teacher-first workspace for Danish upper-secondary education.

Its primary purpose is:

Help teachers go from academic content or an idea to varied, classroom-ready teaching as quickly as possible.

The three main outcomes are:

1. Save preparation time.

2. Make teaching more varied and creative.

3. Rescue teachers on hectic days when preparation time is limited.

CaseLab is NOT primarily:

- an LMS,

- an administration platform,

- a student management system,

- a quiz platform,

- an AI chatbot,

- or a simulation game.

CaseLab should function as the practical teaching layer between tools such as ChatGPT and the classroom.

ChatGPT or other external AI tools may later generate structured teaching content.

CaseLab's job is to:

- organize it,

- edit it,

- store it,

- reuse it,

- present it,

- and eventually make it interactive.

There will be NO AI API integration in the MVP.

==================================================

CORE PRODUCT PRINCIPLE

==================================================

The most important architectural concept is:

BLOCKS ARE THE PLATFORM.

A Lesson consists of Blocks.

A Block is an independent teaching activity.

A Block should eventually be able to:

- exist inside a Lesson,

- be reused in another Lesson,

- be imported from ChatGPT,

- be stored in a Library,

- be presented in Teacher Run Mode,

- become interactive with students,

- and later be used inside persistent classroom Worlds.

Therefore:

Do NOT architect Blocks specifically around one feature such as Worlds.

==================================================

PRIMARY USER

==================================================

The primary user is a teacher.

Initial subjects include:

- Psykologi

- Samfundsfag

- Organisation

But the architecture should not hardcode these as the only possible subjects.

Students are NOT users in Phase 1.

==================================================

LONG-TERM TEACHER FLOWS

==================================================

The product will eventually center around four major teacher needs.

These should inform the architecture and visual design, but they are NOT all being implemented in Phase 1.

1. PLANLÆG UNDERVISNING

Teacher creates a Lesson or course sequence.

2. RED MIG

Teacher has very little preparation time and needs classroom-ready teaching quickly.

3. BRUG MIT MATERIALE

Teacher provides academic content such as:

- iBog excerpts,

- notes,

- articles,

- ChatGPT content.

CaseLab helps turn it into teaching.

4. GØR DEN MERE AKTIV

Teacher already has a Lesson but wants more varied or active teaching.

These will be implemented later.

==================================================

INFORMATION ARCHITECTURE

==================================================

Use this primary structure:

Teacher

→ Classes

→ Units

→ Lessons

→ Blocks

Also prepare architecture for:

Materials

Library

Do NOT implement Worlds yet.

A future optional World may belong to a Class, but Worlds must NOT determine the core data architecture.

==================================================

PHASE 1 — FOUNDATION

==================================================

BUILD ONLY THIS PHASE NOW.

Phase 1 must provide:

1. Authentication

2. Main teacher home

3. Classes

4. Units / teaching sequences

5. Lessons

6. Lesson Editor

7. Block system

8. Persistence

9. Excellent basic UX

Do NOT build ChatGPT import yet.

Do NOT build Teacher Run Mode yet.

Do NOT build Rescue Mode yet.

Do NOT build student interaction.

==================================================

AUTHENTICATION

==================================================

Implement teacher authentication using the existing Lovable-supported backend architecture.

Teachers should only be able to access their own:

- classes,

- units,

- lessons,

- blocks.

Implement proper server-side ownership and Row Level Security where applicable.

Do not rely on frontend-only authorization.

==================================================

HOME

==================================================

Route:

/home

The homepage should NOT look like a traditional dense SaaS dashboard.

The visual reference is modern, friendly educational products such as Khanmigo's teacher experience:

- light,

- spacious,

- approachable,

- premium,

- clear,

- large typography,

- generous whitespace.

Do NOT directly copy another product.

Use these principles to create an original CaseLab visual identity.

The homepage should lead with:

# Hvad skal du bruge i dag?

Subheading:

Kom hurtigere fra fagligt stof til undervisning, der er klar til klassen.

Create four large primary action cards:

✨ Planlæg undervisning

Description:

Lav en lektion eller et forløb.

⚡ Red mig

Description:

Jeg skal undervise snart.

📄 Brug mit materiale

Description:

Lav undervisning ud fra tekst eller noter.

🎨 Gør den mere aktiv

Description:

Skab mere variation i en eksisterende lektion.

IMPORTANT:

Only "Planlæg undervisning" needs to be fully functional in Phase 1.

The other three cards may display a tasteful:

"Kommer snart"

state.

Do not build fake functionality.

==================================================

CONTINUE SECTION

==================================================

Below the hero area:

## Fortsæt hvor du slap

Show recent Lessons.

Example:

2.X · Psykologi

Konformitet og gruppepres

90 min

Button:

Åbn lektion

Keep this section simple.

==================================================

CLASSES

==================================================

Route:

/classes

Heading:

Mine klasser

Teacher can create a Class.

Fields:

- class name

- subject

- school year

- optional notes

Example:

2.X

Psykologi

1.Y

Samfundsfag

3.Z

Organisation

Class cards should show:

- name

- subject

- active Unit count

- recent Lesson if available

Clicking a Class opens:

/classes/:classId

==================================================

CLASS PAGE

==================================================

The Class page should feel like a teaching workspace.

Header:

2.X

Psykologi

Primary CTA:

+ Ny lektion

Secondary CTA:

+ Nyt forløb

Sections:

Aktuelt forløb

Seneste lektioner

Forløb

Do not add student rosters.

Do not add grades.

Do not add attendance.

This is a teaching workspace, not school administration software.

==================================================

UNITS

==================================================

A Unit is a teaching sequence / forløb.

Examples:

Socialpsykologi

Stress

Politik og demokrati

Motivation og ledelse

Fields:

- id

- teacher_id

- class_id

- title

- description

- status

- sort_order

- created_at

- updated_at

Status:

planned

active

completed

Danish UI:

Planlagt

Aktivt

Afsluttet

==================================================

LESSONS

==================================================

A Lesson belongs to a Class.

It may optionally belong to a Unit.

Lesson fields:

- id

- teacher_id

- class_id

- unit_id nullable

- title

- subject

- duration_minutes

- learning_goal

- teacher_note

- lesson_date nullable

- status

- mode

- created_at

- updated_at

Status:

draft

ready

completed

Mode:

standard

rescue

Rescue exists in the schema for future use.

Do NOT implement Rescue Mode functionality yet.

==================================================

CREATE LESSON

==================================================

Route:

/lessons/new

Keep the initial form lightweight.

Fields:

Klasse

Forløb — optional

Titel

Varighed

Quick values:

45 min

60 min

90 min

Andet

Læringsmål — optional

Lærernote — optional

Primary CTA:

Opret lektion

After creation:

Navigate directly to Lesson Editor.

==================================================

LESSON EDITOR

==================================================

Route:

/lessons/:lessonId/edit

This is the most important Phase 1 screen.

It should feel like a modern teaching studio.

NOT:

- a spreadsheet,

- database editor,

- administration form.

Think:

Notion-like editing simplicity

+

modern educational tool

+

clear timeline planning.

Header:

Lesson title

Class + subject

Optional Unit

Status

Planned duration

Actions:

Gem

Forhåndsvis

"Start undervisning" may appear disabled or marked "kommer snart".

Do NOT implement Teacher Run yet.

==================================================

LESSON TIMELINE

==================================================

Display Blocks vertically.

Example:

00–08 MIN

DILEMMA

Ville du sige imod gruppen?

---

08–20 MIN

LÆRERINPUT

Konformitet og Asch

---

20–40 MIN

CASE

Emma starter hos NOVA

Calculate cumulative timing automatically.

If Lesson duration is 90 minutes and Blocks total 75:

Show:

15 minutter tilbage

If Blocks total 105:

Show:

15 minutter over planlagt tid

Do not prevent saving.

==================================================

BLOCK DATA MODEL

==================================================

Create a reusable Lesson Blocks model.

Fields:

- id

- lesson_id

- teacher_id

- block_order

- type

- title

- duration_minutes

- student_instructions

- teacher_notes

- content JSON

- created_at

- updated_at

Use JSON only for block-type-specific content.

Common data should remain in normal fields.

==================================================

SUPPORTED BLOCK TYPES V1

==================================================

Implement exactly these Block types:

FORMIDLING

teacher_content

Danish label:

Lærerinput

narrative

Danish label:

Fortælling

ANALYSE

case

Danish label:

Case

theory_test

Danish label:

Test teorien

compare

Danish label:

Sammenlign

find_the_error

Danish label:

Find fejlen

DISKUSSION

discussion

Danish label:

Diskussion

dilemma

Danish label:

Dilemma

position

Danish label:

Tag stilling

INTERAKTION

poll

Danish label:

Afstemning

ranking

Danish label:

Rangering

scale

Danish label:

Skala

short_response

Danish label:

Kort svar

AFRUNDING

exit_ticket

Danish label:

Exit ticket

Do NOT add World-specific:

decision

outcome

in Phase 1.

==================================================

COMMON BLOCK CONTRACT

==================================================

Every Block has:

type

title

duration_minutes

student_instructions

teacher_notes

content

The content structure depends on Block type.

==================================================

BLOCK CONTENT SCHEMAS

==================================================

teacher_content:

{

  "body": "..."

}

narrative:

{

  "text": "..."

}

case:

{

  "scenario": "...",

  "questions": ["...", "..."]

}

theory_test:

{

  "theory": "...",

  "scenario": "...",

  "question": "...",

  "options": ["...", "..."],

  "follow_up_questions": ["...", "..."]

}

compare:

{

  "item_a": "...",

  "item_b": "...",

  "questions": ["...", "..."]

}

find_the_error:

{

  "material": "...",

  "errors_to_find": 3,

  "follow_up_question": "..."

}

discussion:

{

  "prompt": "...",

  "follow_up_questions": ["...", "..."]

}

dilemma:

{

  "scenario": "...",

  "question": "...",

  "options": ["...", "..."],

  "require_justification": true

}

position:

{

  "statement": "...",

  "left_label": "Helt uenig",

  "right_label": "Helt enig",

  "follow_up_question": "..."

}

poll:

{

  "question": "...",

  "options": ["...", "..."]

}

ranking:

{

  "question": "...",

  "items": ["...", "..."]

}

scale:

{

  "question": "...",

  "min": 1,

  "max": 7,

  "left_label": "...",

  "right_label": "..."

}

short_response:

{

  "question": "...",

  "placeholder": "..."

}

exit_ticket:

{

  "questions": ["...", "..."]

}

==================================================

ADD BLOCK UX

==================================================

Inside Lesson Editor provide:

+ Tilføj aktivitet

Open a visually clear activity picker.

Group types:

Formidling

Analyse

Diskussion

Interaktion

Afrunding

Each type should have:

- icon

- Danish name

- one-line description

Example:

CASE

Lad eleverne anvende stoffet på en konkret situation.

DILEMMA

Lad eleverne tage stilling og begrunde deres valg.

TEST TEORIEN

Lad eleverne anvende en teori på en ny situation.

==================================================

BLOCK EDITING

==================================================

Use a polished side drawer or inline editor.

Never expose raw JSON.

Show appropriate form controls for each block.

Common fields:

Titel

Varighed

Elevinstruktion

Lærernoter

Then block-specific fields.

==================================================

BLOCK REORDERING

==================================================

Support drag-and-drop.

Persist block_order after reorder.

Teacher should also have accessible Move Up / Move Down alternatives if practical.

==================================================

DUPLICATION

==================================================

Allow Block duplication.

The duplicate should appear directly below the original.

Allow Lesson duplication.

Duplicated Lesson:

status = draft

title:

[original title] – kopi

Duplicate all Blocks.

==================================================

PREVIEW

==================================================

Create a lightweight Lesson preview.

This is NOT Teacher Run Mode.

Purpose:

Let teacher inspect the complete Lesson without editing controls.

Display Blocks in sequence.

Button:

Tilbage til redigering

==================================================

EMPTY STATES

==================================================

Use helpful Danish empty states.

Example Lesson with no Blocks:

# Din lektion er klar til at blive bygget

Tilføj din første aktivitet og sammensæt undervisningen trin for trin.

Button:

+ Tilføj aktivitet

Avoid generic:

"No data found."

==================================================

VISUAL DESIGN

==================================================

This is important.

CaseLab V2 should be visually:

- light,

- calm,

- warm,

- modern,

- teacher-friendly,

- sophisticated,

- spacious.

Use:

- light backgrounds

- generous whitespace

- large readable typography

- subtle borders

- soft shadows where useful

- restrained rounded corners

- clear visual hierarchy

- one primary accent family

- subtle secondary subject accents if needed

Avoid:

- dark dashboards

- enterprise admin styling

- information overload

- excessive gradients

- neon

- childish gamification

- tiny typography

- dense sidebars

- huge numbers of cards

The homepage in particular should feel simple even if the underlying app is powerful.

==================================================

NAVIGATION

==================================================

Keep navigation minimal.

Suggested desktop navigation:

CaseLab logo / wordmark

Hjem

Klasser

Lektioner

Bibliotek — disabled / coming soon if not implemented

User menu

Do not create a complex multi-level sidebar unless clearly needed.

==================================================

RESPONSIVE DESIGN

==================================================

Primary teacher device:

laptop.

Optimize Lesson Editor particularly for 13–16 inch laptops.

Basic mobile responsiveness is required, but teacher editing on phones is not a primary Phase 1 use case.

==================================================

DEMO DATA

==================================================

Provide an optional:

Indlæs demo

development/demo helper.

Create:

2.X · Psykologi

Unit:

Socialpsykologi

Lesson:

Konformitet og gruppepres

90 min

Include sample Blocks:

- dilemma

- teacher_content

- case

- theory_test

- discussion

- exit_ticket

Also:

1.Y · Samfundsfag

3.Z · Organisation

Do not make demo data mandatory for normal accounts.

==================================================

TECHNICAL QUALITY

==================================================

Use real persistence.

Do not create mock-only flows.

Use typed models.

Use schema validation where useful.

Use server-side access control.

Implement meaningful loading states.

Implement meaningful error states.

No primary action may silently do nothing.

Buttons triggering asynchronous actions should:

- show progress,

- prevent accidental duplicate requests,

- report errors visibly.

==================================================

TESTING REQUIREMENT

==================================================

Do not treat compilation as proof that the product works.

Test the Phase 1 user journey:

1. Create account / sign in.

2. Create Class.

3. Create Unit.

4. Create Lesson.

5. Add six different Blocks.

6. Edit each.

7. Reorder Blocks.

8. Duplicate a Block.

9. Refresh browser.

10. Confirm persistence.

11. Preview Lesson.

12. Return to edit.

13. Duplicate Lesson.

14. Confirm copied Blocks exist.

If a step fails, fix it before declaring Phase 1 complete.

==================================================

PHASE 1 DEFINITION OF DONE

==================================================

Phase 1 is complete only when a teacher can:

Class

→ Unit

→ Lesson

→ Blocks

→ Edit

→ Reorder

→ Save

→ Preview

with real persistence and without silent failures.

Do NOT proceed to:

ChatGPT import

Teacher Run

Rescue Mode

Materials

Student Live

Worlds

until this foundation works reliably.

When complete, provide a short implementation report containing:

- database structure implemented

- routes created

- components created

- tests actually performed

- known limitations

- PASS/FAIL for the main user journey

Do not claim functionality was tested unless the flow was actually executed.

This project was originally built with [Lovable](https://lovable.dev), but Lovable is not required
to run, build, host, authenticate, or store data for CaseLab.

**Live app**: https://lesson-block-lab.lovable.app

## Optional Lovable workflow

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f1e2c2c2-abc2-43c0-8ea6-bf12577046dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Local development

CaseLab uses Node.js and npm. `package-lock.json` is the canonical dependency lockfile.

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
cp .env.example .env
npm run dev
```

Fill in `.env` with values from your Supabase project settings:

- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are used by server-side authenticated flows.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser-safe values embedded by Vite.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `VITE_`, expose it to client code,
  or commit it. Anonymous student session server functions require it.

`SUPABASE_PROJECT_ID` and `VITE_SUPABASE_PROJECT_ID` are not used by the application.

Build the production bundle with:

```sh
npm run build
```

Supabase schema changes live in `supabase/migrations`. Apply them with the Supabase CLI, for
example `supabase db push`; use `supabase db reset` only against a local development database.
The private `material-files` bucket is created by migration. Optional manual development fixtures
live under `supabase/fixtures` and are not part of normal migration replay.
