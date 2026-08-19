# Plan: Didaktiva — Cross-Product Consistency + Brand Finish

Finalize V2 across the product with a focus on visual consistency, Materials, Worlds, planning forms, and branding.

## Design Source of Truth
Use current V2 Home, Lesson Editor, and Teacher Cockpit as the reference.
- Warm, calm, professional Danish educational aesthetic.
- Colors: Warm off-white background, dark warm text, green/teal primary accent, sand/beige secondary, muted orange sparing accent.
- Components: Soft borders, discrete shadows, rounded cards, Lucide icons.

## Tasks

### 1. Materials V2 Consistency
- **File**: `src/routes/_authenticated/materials.tsx`
- **Actions**:
    - Update page header and intro text for V2.
    - Redesign material cards to match V2 cards (hover lift, compact metadata, clear file types).
    - Group secondary actions.
    - Improve empty state.

### 2. Planning Tools V2 (ChatGPT Generators)
- **Files**:
    - `src/routes/_authenticated/create-with-chatgpt.tsx`
    - `src/routes/_authenticated/material-to-lesson.tsx`
    - `src/routes/_authenticated/rescue.tsx`
    - `src/routes/_authenticated/differentiate.tsx`
    - `src/routes/_authenticated/improve-lesson.tsx`
    - `src/routes/_authenticated/extra-time.tsx`
- **Actions**:
    - Standardize headers, intros, and form containers.
    - Use V2 hierarchy and spacing.
    - Improve file picker and selected files visibility in "Brug mit materiale".
    - Rename "Jeg mangler tid" to "Fyld lektionen ud" on the Home tools list (done in HomeV2, but ensure route title matches).

### 3. Worlds V2 Visual Lift
- **Files**:
    - `src/routes/_authenticated/worlds.index.tsx`
    - `src/routes/_authenticated/worlds.$worldId.tsx`
- **Actions**:
    - **Index**: Redesign world cards to show title, subject/class, episodes, and status with V2 styling.
    - **Detail**: Improve hierarchy between Overview, Episodes, State, and History. Use timeline-inspired sequence for episodes.
    - **State/Consequences**: Make technical areas more readable with compact rows and clear current values.

### 4. Sessions V2
- **File**: `src/routes/_authenticated/sessions.index.tsx`
- **Actions**:
    - Match V2 card styling.
    - Triage primary/secondary actions (Cockpit vs Results).

### 5. Classes / Units / Library Consistency
- **Files**:
    - `src/routes/_authenticated/classes.index.tsx`
    - `src/routes/_authenticated/classes.$classId.tsx`
    - `src/routes/_authenticated/lessons.index.tsx`
    - `src/routes/_authenticated/library.tsx`
- **Actions**:
    - Consistency polish for page headers, card radius, spacing, and metadata styles.

### 6. Branding & Metadata
- **Files**:
    - `src/routes/__root.tsx`
    - `src/routes/index.tsx`
    - `src/routes/auth.tsx`
    - `src/components/AppShell.tsx`
    - `src/lib/design-mode.ts`
- **Actions**:
    - Consistently use "Didaktiva" instead of "CaseLab" in user-facing UI (V2 mode).
    - Implement the "D" brandmark symbol in SVG.
    - Update browser titles and OG metadata.
    - Update landing page and auth page branding.
    - Create a simple SVG favicon.

### 7. Global Visual Tokens Audit
- **File**: `src/styles.css`
- **Actions**:
    - Ensure `surface-card`, `surface-quiet`, and radius tokens are used consistently.

## Technical Notes
- **Design Variant**: All changes will respect `useDesignMode() === "v2"`.
- **Branding**: "CaseLab" remains in internal technical contracts (JSON, DB, versions).
- **Responsive**: Verify at 390px, 768px, 1440px.
- **Safety**: No changes to Supabase, RLS, server functions, or logic.
