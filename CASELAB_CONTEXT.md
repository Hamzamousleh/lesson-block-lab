# CASELAB_CONTEXT.md

## 1. Purpose

This file is the authoritative handoff context for continuing development of **CaseLab** in ChatGPT Codex.

Read this file before making changes.

Treat the existing repository as the source of truth for current implementation details. Use this document for product intent, architectural constraints, workflow conventions, and development priorities.

If this file and the repository disagree:
1. inspect the repository,
2. identify the mismatch,
3. preserve working behavior unless there is a clear bug,
4. report the discrepancy before making broad changes.

---

## 2. Product vision

CaseLab is a teacher-first teaching platform for Danish upper-secondary education.

Core promise:

> CaseLab helps a teacher quickly turn subject matter into varied, classroom-ready activity.

The platform is not meant to replace the teacher. It should help the teacher:
- save preparation time,
- increase flexibility,
- create more varied lessons,
- recover quickly on hectic days,
- make student participation easier,
- run live interactive teaching,
- reuse and adapt material.

The product should feel light, calm, friendly, and educational — not like a heavy enterprise LMS.

Design direction:
- warm, spacious, modern UI,
- clear hierarchy,
- soft cards,
- calm accent color,
- minimal navigation,
- no dark dashboard aesthetic,
- no childish gamification,
- projector/laptop-friendly teacher views,
- mobile-friendly student views.

---

## 3. Fundamental architecture principle

### ChatGPT = the brain
### CaseLab = the structured workspace / hub

CaseLab should not require expensive runtime AI to function.

Preferred workflow:

1. Teacher chooses an intent in CaseLab.
2. CaseLab generates a structured prompt.
3. Teacher copies prompt to ChatGPT.
4. ChatGPT generates CaseLab-compatible JSON.
5. Teacher imports JSON into CaseLab.
6. CaseLab handles storage, editing, teaching, sessions, responses, and reuse.

Runtime AI should be avoided unless there is a compelling future reason.

---

## 4. Vendor-independence rule

Hard architectural rule:

> Lovable may be the development tool, but must not become a production/runtime dependency.

Any new feature should be evaluated with:

> “Will this still work if the Lovable subscription is cancelled tomorrow?”

Avoid:
- Lovable-only AI runtime,
- Lovable-specific document parsing,
- runtime Lovable credit dependence,
- proprietary hosting assumptions where avoidable.

Preferred runtime stack:
- standard React/Vite code,
- Supabase or equivalent backend,
- standard storage/auth/database primitives,
- external hosting on own domain later.

The long-term goal is to unsubscribe from Lovable and host CaseLab independently.

---

## 5. Core data hierarchy

Primary teacher hierarchy:

Teacher
→ Classes
→ Units
→ Lessons
→ Blocks

Worlds are an optional higher-level continuity layer, not the mandatory foundation.

Worlds should never force every lesson into a simulation.

---

## 6. Blocks are the platform

CaseLab currently supports 14 block types:

1. teacher_content
2. narrative
3. case
4. theory_test
5. compare
6. find_the_error
7. discussion
8. dilemma
9. position
10. poll
11. ranking
12. scale
13. short_response
14. exit_ticket

Generic block shape:

```json
{
  "type": "case",
  "title": "...",
  "duration_minutes": 15,
  "student_instructions": "...",
  "teacher_notes": "...",
  "content": {}
}
```

Schemas:

```text
teacher_content:
{ "body": "..." }

narrative:
{ "text": "..." }

case:
{ "scenario": "...", "questions": ["..."] }

theory_test:
{
  "theory": "...",
  "scenario": "...",
  "question": "...",
  "options": ["..."],
  "follow_up_questions": ["..."],
  "correct_option_index": 0,            // optional
  "feedback": {                         // optional
    "correct": "...",
    "incorrect": "..."
  }
}

compare:
{ "item_a": "...", "item_b": "...", "questions": ["..."] }

find_the_error:
{
  "material": "...",
  "errors_to_find": 3,
  "follow_up_question": "..."
}

discussion:
{ "prompt": "...", "follow_up_questions": ["..."] }

dilemma:
{
  "scenario": "...",
  "question": "...",
  "options": ["..."],
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
{ "question": "...", "options": ["..."] }

ranking:
{ "question": "...", "items": ["..."] }

scale:
{
  "question": "...",
  "min": 1,
  "max": 7,
  "left_label": "...",
  "right_label": "..."
}

short_response:
{ "question": "...", "placeholder": "..." }

exit_ticket:
{ "questions": ["..."] }
```

---

## 7. Canonical CaseLab v2 transport contract

### Lesson package

```json
{
  "caselab_version": "2.0",
  "package_type": "lesson",
  "mode": "standard",
  "lesson": {
    "title": "...",
    "subject": "Psykologi",
    "duration_minutes": 90,
    "learning_goal": "...",
    "teacher_note": "...",
    "blocks": []
  }
}
```

`mode` may be:
- standard
- rescue

### Blocks package

```json
{
  "caselab_version": "2.0",
  "package_type": "blocks",
  "blocks": []
}
```

Critical rule:

Never emit legacy structures such as:

```json
{
  "type": "lesson",
  "blocks": []
}
```

or top-level lesson blocks when `package_type: "lesson"` is used.

The lesson blocks must live at:

`lesson.blocks`

---

## 8. Prompt contract status

The prompt contract was hotfixed and audited.

Shared prompt constants/helpers were introduced in the project, including equivalents of:

- CASELAB_V2_COMMON_RULES
- CASELAB_V2_BLOCK_SCHEMAS
- CASELAB_V2_LESSON_OUTPUT_CONTRACT
- CASELAB_V2_BLOCK_OUTPUT_CONTRACT

Builders audited successfully included:

- Planlæg undervisning
- Planlæg undervisning (aktiviteter)
- Brug mit materiale
- Brug mit materiale (aktiviteter)
- Brug mit materiale (Quiz / MCQ)
- Red mig
- Jeg mangler tid
- Gør lektionen mere aktiv
- Differentiering
- Arbejd videre med svarene
- Klasseplanlægning
- World creation
- Next World Episode
- World reflection
- Konsekvens-refleksion

Do not reintroduce schema duplication.

---

## 9. Current main teacher flows

Core teacher intents include:

- Planlæg undervisning
- Red mig
- Brug mit materiale
- Gør den mere aktiv
- Jeg mangler tid
- Differentiering
- Arbejd videre med svarene

These should remain teacher-first and action-oriented.

The product should not become a generic LMS.

---

## 10. Lesson Editor

Existing capabilities include:
- block-based lesson editing,
- all 14 block types,
- editing block content,
- drag reorder,
- touch/keyboard reorder using Flyt op / Flyt ned,
- duration tracking,
- import activities,
- copy/reuse behavior where exposed,
- Teacher Run / Cockpit entry point.

Reordering logic has been stabilized:
- drag-and-drop and button reordering reuse the same persistence path,
- order persists after refresh,
- boundary controls are disabled appropriately.

Do not replace existing reorder behavior.

---

## 11. Student Sessions

Student sessions are a core V1 feature.

Public flow:
- student can join without an account,
- join by code,
- participant identity/token is reused on ordinary refresh/re-entry,
- student follows teacher-controlled active block,
- answers persist,
- current block updates through polling,
- anonymous behavior is preserved.

Important current behavior:
- normal refresh must not create duplicate participants,
- counts should use active/logical participants,
- active participant window currently uses recent activity rather than historical rows,
- response denominator should reflect active participants,
- student routes must not expose teacher-only data.

Current polling limitations:
- student updates are poll-based, not realtime sockets,
- acceptable V1 lag is a few seconds,
- do not convert to realtime unless there is a real need.

---

## 12. Student UX lessons from real classroom use

CaseLab was tested with real students and received strong positive feedback.

The most important product insight:

> CaseLab gives quieter students a voice before the most vocal students dominate the discussion.

Students especially valued:
- being able to answer without raising a hand,
- seeing that others had similar answers,
- increased confidence to participate orally afterwards,
- better overview,
- easier inclusion.

One particularly important pedagogical pattern:

individual response
→ see class distribution / anonymous responses
→ gain confidence
→ participate orally

This should influence future UX choices.

CaseLab should not make every task digital.

Preferred rhythm:
CaseLab
→ pair discussion
→ plenary
→ teacher input
→ movement
→ CaseLab again

Student feedback also revealed and led to fixes for:
- page jumping caused by polling,
- uncertain save-state,
- need for teacher-controlled answer reveal,
- difficulty with fast free-text responses.

---

## 13. Student response save UX

Current response state should remain explicit:

- Indsend svar
- Gemmer…
- ✓ Svar gemt
- Gem ændringer
- ✓ Ændringer gemt
- Kunne ikke gemme — prøv igen

Do not silently fail.
Do not lose local student text on request failure.
Do not remount or clear text during background polling.

---

## 14. Teacher Cockpit V1

Teacher Cockpit is a validated core feature.

Purpose:
help the teacher run a live lesson without switching across multiple pages.

Core cockpit features currently include:
- faithful student preview,
- current activity,
- activity X of Y,
- allocated activity time,
- live countdown,
- pause/reset,
- +1 / +2 min,
- overtime display,
- no auto-advance at zero,
- optional student timer,
- lesson timeline,
- plan vs actual timing drift,
- teacher notes,
- response counts,
- answer distribution,
- free-text response preview,
- previous / next / skip,
- theory_test answer reveal,
- same-session deep-link from session page.

Important:
The cockpit must show what students are actually seeing.

Teacher notes must never appear in student payloads.

Session → Cockpit now supports opening the exact existing session:
- same session,
- same active block,
- same timer,
- same reveal state,
- no duplicate session.

---

## 15. Theory test reveal

`theory_test` supports optional:
- correct_option_index
- feedback.correct
- feedback.incorrect

Live teaching behavior:

Before teacher reveal:
- student answer is stored,
- student sees answer registered,
- student does not see correctness.

After teacher clicks “Vis facit”:
- correct option is shown,
- personal correctness is shown,
- correct/incorrect feedback appears.

Do not expose correctness before reveal through client payloads.

---

## 16. Response → Action / Phase 5

Existing functionality includes:
- work further with student responses,
- differentiation,
- class insight,
- response library,
- CSV export,
- session comparison.

The goal is not a giant analytics dashboard.

The valuable loop is:

responses
→ teacher insight
→ next teaching action

Keep this practical.

---

## 17. Library and reuse

Reuse is important because CaseLab should save preparation time over repeated use.

Existing/relevant capabilities:
- lesson copying,
- block reuse/import,
- response saving,
- library,
- copy-to-class where exposed.

Avoid building a document management system or LMS asset bureaucracy.

---

## 18. Worlds

Worlds are persistent learning universes.

Conceptual loop:

World
→ Episodes
→ Lessons / Blocks
→ Sessions
→ Responses
→ Consequences
→ Updated World State
→ Next Episode

Worlds should add:
- continuity,
- recurring people,
- meaningful progression,
- consequences,
- narrative memory.

They should not become gamification.

Avoid:
- XP,
- points,
- achievements,
- inventories,
- childish game mechanics.

Use recurring characters where pedagogically useful.

World continuity rule:
- reuse existing characters before inventing new ones,
- reintroduce recurring people when relevant,
- preserve world history/state,
- use World as a red thread, not a constraint on every lesson.

---

## 19. Example Psychology World continuity

A recurring example World is NOVA.

Premise:
fictional youth/cultural house.

Recurring people:
- Maja, 18 — identity / multiple communities
- Jonas, 19 — approval seeking / difficulty saying no
- Amalie, 18 — socially confident / performance pressure
- Elias, 20 — questions group norms
- Sara, 34 — staff member trying to create safety without control

Example state variables:
- group_trust
- group_pressure
- maja_identity_conflict
- amalie_stress
- jonas_need_for_approval
- conflict_level
- psychological_safety

Do not treat this specific World as hardcoded product logic.

---

## 20. Worlds implementation status

Worlds have been substantially implemented and later completed/stabilized.

Capabilities include:
- World state,
- episodes,
- consequences,
- student-linked episode sessions,
- sanitized student World context,
- majority_choice / threshold / response_distribution triggers,
- teacher consequence preview/confirm,
- delayed consequences,
- unlock conditions,
- basic branching,
- duplicate episode detection,
- World import safeguards,
- copy/complete behaviors where exposed.

A later V1 audit runtime-tested the full World loop successfully.

Recent duplicate-episode fix:
- duplicate detection now lives inside the import layer,
- normalized title comparison,
- episode number+branch checks,
- safe-copy assigns next free episode number,
- "(kopi)" appended on title conflict when needed.

Do not move duplicate protection back into UI cache-only logic.

---

## 21. World consequence principles

Consequence state changes should remain:
- previewed before application,
- teacher-confirmed,
- historically logged,
- reversible where already supported.

State should not change merely because a preview is opened.

Student-visible and teacher-only state must remain separated.

---

## 22. Current V1 audit status

A broad V1 audit was completed with runtime testing.

Results:
- no blockers,
- core teacher → student flow passed,
- lesson edit/refresh persistence passed,
- canonical lesson import passed,
- canonical block import passed,
- public student join passed,
- save/reveal/navigation passed,
- Teacher Cockpit passed,
- session follow-up passed,
- World full loop passed,
- privacy/unauthorized checks passed,
- narrow student viewport passed,
- console/network route sweep passed.

Main high findings were then addressed:
- session page → direct cockpit,
- participant-count hygiene,
- touch/keyboard block reordering,
- React lifecycle warning,
- World duplicate episode guard.

These have been reported as passing their runtime tests.

---

## 23. React warning fix

A shared `useSession` async state-update warning was fixed by guarding async state updates with an active/unmount flag.

Do not reintroduce state writes after unmount.

---

## 24. Participant counting

Current principle:

The live denominator should represent meaningful active participants, not every historical join row.

Ordinary refresh/re-entry on same browser/device should reuse the participant token/row.

Do not introduce:
- student accounts,
- invasive fingerprinting,
- cross-browser identity tracking,
- attendance features.

This is response-count hygiene, not attendance management.

---

## 25. Material Files V1 — next planned feature

This is one of the next important features.

Use case:
teacher uploads files such as:
- PowerPoint,
- PDF,
- Word,
- images,

then CaseLab references those files in a generated ChatGPT prompt.

Important V1 architecture:

CaseLab should NOT parse or understand the file itself.

CaseLab should:
1. store the file,
2. store metadata,
3. associate it with teacher/class/unit/lesson,
4. include filename + instructions in generated prompts,
5. tell the teacher to attach the same file in ChatGPT.

Example generated prompt section:

```text
VEDHÆFTEDE FILER

Attach these files in ChatGPT together with this prompt:

- Intro til PsykC.pptx
- Kapitel 3.pdf

Use these files as the primary teaching source.
Do not invent content that is not present in the attached files.
```

Preferred storage:
- Supabase Storage or equivalent existing standard backend storage.

Do not build in V1:
- automatic PPTX parsing,
- PDF extraction,
- OCR,
- embeddings,
- vector search,
- AI summaries,
- document chat,
- semantic search,
- Google Drive / OneDrive / Dropbox integrations,
- student file uploads.

Supported file types intended for V1:
- PDF
- PPTX
- DOCX
- PNG
- JPG / JPEG
- WEBP

---

## 26. Material Library direction

Potential route:
`/materials`

Simple teacher-facing library showing:
- title,
- original filename,
- file type,
- subject,
- class/unit association,
- upload date.

Actions:
- Brug i prompt
- associate to class/unit/lesson
- open/download
- delete

Do not over-engineer tags/versioning/document management.

---

## 27. “Brug mit materiale” future file flow

Preferred UX:

Teacher chooses either:
- paste text,
- select uploaded file(s).

CaseLab generates prompt including:
- exact filenames,
- reminder to attach them in ChatGPT,
- instruction to use them as primary source,
- existing CaseLab 2.0 output contract.

CaseLab must never pretend it has read file contents if it has not.

---

## 28. Product behavior for PowerPoint conversion

When turning a PowerPoint into a CaseLab lesson, the goal is not slide-by-slide transcription.

Preferred transformation:

PowerPoint
→ content bank / teacher intent
→ preserve strong didactic progression
→ reduce passive teacher talk
→ convert suitable parts to interactive blocks
→ keep useful teacher explanations
→ create a lesson rhythm between digital and oral activity.

CaseLab should help improve teaching design, not merely digitize slides.

---

## 29. Real classroom pedagogy principles

CaseLab should support:
- individual thinking before plenary,
- anonymous or low-pressure participation,
- pair discussion,
- group discussion,
- plenary interpretation of class responses,
- teacher-controlled pacing,
- reflection,
- application,
- varied activity forms.

Do not optimize for “students stare at CaseLab for 90 minutes.”

---

## 30. Example teaching design pattern

A strong interactive lesson often looks like:

1. short_response / poll
2. pair discussion
3. short teacher input
4. compare / theory_test
5. case
6. plenary
7. dilemma / position
8. exit_ticket

The exact sequence should vary by subject and content.

---

## 31. Teacher UX principle

The teacher should feel that they are controlling the teaching, not operating software.

When live teaching, CaseLab should answer:

- What do students see?
- What are they supposed to do?
- How long do they have?
- How many have answered?
- What are they thinking?
- What comes next?
- Are we ahead or behind schedule?

Avoid clutter.

---

## 32. Time handling principle

Activity timing is guidance, not automation.

A timer reaching zero must not automatically advance the class.

Preferred behavior:
- countdown to zero,
- then overtime count upward,
- teacher decides what to do next.

---

## 33. Prompt-writing principles

CaseLab-generated prompts should:
- be copyable as plain text,
- clearly state the task,
- clearly state subject/class/duration,
- include canonical package contract,
- forbid unsupported block types,
- prioritize practical classroom usability,
- avoid vague generic activities,
- avoid unknown external resources,
- avoid unsupported assumptions,
- preserve source-material fidelity when files/text are provided.

---

## 34. Development reporting policy

Lovable reports became too expensive when overly long.

Future implementation prompts should require a SHORT report.

Preferred format:

## BUILT / FIXED
## ARCHITECTURE
## TESTS ACTUALLY RUN
## KNOWN LIMITATIONS
## STATUS

Typical max:
500–700 words.

Do not accept PASS unless relevant runtime tests were actually executed.

Code review alone is not runtime testing.

---

## 35. Credit-efficiency strategy

Development strategy is now stabilization/completion mode.

Preferred:
- small focused prompts,
- one clear problem area,
- runtime acceptance tests,
- short implementation report.

Avoid:
- broad refactors,
- speculative feature creep,
- “while you are here…” additions,
- cosmetic redesign cycles.

Real classroom issues take priority over imagined product ideas.

---

## 36. Current V1 priorities

Current priorities, in order:

1. Material Files V1
2. Vendor-independence / Lovable exit audit
3. Any issues surfaced by real classroom use
4. Final deployment readiness
5. Only then optional polish

Do not invent new large subsystems unless a real need emerges.

---

## 37. Deployment / Lovable exit goal

Before considering CaseLab finished, verify:

- repository is complete in Git,
- app runs locally from repository,
- env vars are documented,
- Supabase/project dependencies are documented,
- storage dependencies are documented,
- no Lovable runtime dependency is required,
- production build succeeds outside Lovable,
- external deployment can serve app on own domain.

A future vendor-independence audit should explicitly answer:

> “If Lovable disappeared tomorrow, what would stop working?”

---

## 38. Security principles

Maintain:
- teacher-owned RLS,
- student access only through session mechanisms,
- no teacher notes in public payloads,
- no answer keys before reveal,
- no hidden World state sent to students,
- no cross-teacher file access,
- no weakening RLS for convenience.

Any cross-teacher or student-to-teacher data exposure is a blocker.

---

## 39. Do not turn CaseLab into an LMS

Avoid unless explicitly reconsidered:
- attendance systems,
- gradebook,
- student accounts,
- payments,
- notifications,
- achievements,
- points,
- homework submission infrastructure,
- broad school administration features.

CaseLab is a teaching-design and live-teaching tool.

---

## 40. Tone / UX language

Primary interface language:
Danish.

Use simple, teacher-friendly language.

Examples:
- Åbn cockpit
- Start elevsession
- Vis facit
- Svar gemt
- Vent på næste aktivitet
- Flyt op
- Flyt ned
- Brug mit materiale
- Gør den mere aktiv
- Jeg mangler tid
- Red mig

Avoid overly technical language in teacher-facing UI.

---

## 41. Definition of CaseLab V1 DONE

V1 can be considered complete when:

PLAN
Teacher can create 45/60/90-minute lesson from idea or material.

IMPORT
ChatGPT output imports reliably.

EDIT
Teacher can change content, order, and timing quickly.

RUN
Teacher can run lesson from Teacher Cockpit.

STUDENT
Students can join without accounts and participate live.

RESPONSES
Teacher can see and use responses during and after teaching.

ADAPT
Teacher can use responses to plan next steps.

RESCUE
Teacher can adapt when lesson runs faster/slower than expected.

REUSE
Teacher can reuse lessons and blocks.

WORLD
At least one complete World loop works end-to-end.

FILES
Teacher can attach/upload teaching material and use it in prompt workflows.

ROBUST
Refresh/login/RLS/sessions do not break core flows.

PORTABLE
CaseLab can run without an active Lovable subscription.

If these are all true, stop expanding V1 and use it in real teaching.

---

## 42. Codex working instructions

When continuing development:

1. Read this file first.
2. Inspect the repository before assuming implementation details.
3. Preserve working behavior.
4. Prefer minimal targeted changes.
5. Avoid broad refactors unless a concrete issue requires them.
6. Respect the CaseLab v2 package contract.
7. Respect vendor independence.
8. Protect student/teacher privacy.
9. Run relevant runtime tests when changing live flows.
10. Report what was actually tested.
11. Do not claim PASS without evidence.
12. Optimize for real classroom usefulness, not feature count.

---

## 43. Immediate next development task

Recommended next task:

### Material Files V1

Implement:
- private teacher-owned file upload,
- standard backend storage,
- lightweight material library,
- file metadata,
- class/unit/lesson associations where practical,
- integration into “Brug mit materiale”,
- generated prompt reminder to manually attach files in ChatGPT,
- no runtime AI,
- no file parsing,
- no Lovable-only dependency.

After Material Files V1:

### Vendor-independence audit

Audit:
- Lovable-specific imports,
- Lovable runtime services,
- env vars,
- hosting assumptions,
- cloud-only functions,
- storage/auth/database dependencies,
- production build outside Lovable.

---

## 44. Final product mantra

> Build CaseLab with Lovable.
> Do not build CaseLab on Lovable.

> ChatGPT is the brain.
> CaseLab is the teaching workspace.

> Blocks are the platform.

> The teacher controls the teaching.
