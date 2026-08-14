-- Manual development fixture. This file is deliberately outside
-- supabase/migrations and is not executed by a normal migration replay.
-- It only inserts data when the original development teacher and class exist.
DO $$
DECLARE
  t uuid := '279c9b47-c114-4045-b594-45fe14ced6d7';
  c uuid := '207eaada-58ad-447a-98e1-cf4d80d87380';
  l uuid := '11111111-2222-4333-8444-555555555001';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = t)
     AND EXISTS (SELECT 1 FROM public.classes WHERE id = c AND teacher_id = t) THEN
    DELETE FROM public.lessons WHERE id = l;
    INSERT INTO public.lessons (id, teacher_id, class_id, title, subject, duration_minutes, learning_goal, status, mode)
    VALUES (l, t, c, 'Cockpit-test: Hukommelse og perception', 'Psykologi', 45,
            'Eleverne kan forklare forskellen mellem hverdagsforstaaelse og psykologisk teori.', 'ready', 'standard');

    INSERT INTO public.lesson_blocks (lesson_id, teacher_id, block_order, type, title, duration_minutes, student_instructions, teacher_notes, content) VALUES
    (l, t, 0, 'poll', 'Hvor god er din hukommelse?', 5, 'Vaelg det svar der passer bedst paa dig.', 'Brug fordelingen som opvarmning.',
     '{"question":"Hvor praecis synes du din hukommelse er?","options":["Meget praecis","Nogenlunde","Ret upaalidelig"]}'::jsonb),
    (l, t, 1, 'short_response', 'Beskriv en staerk erindring', 10, 'Skriv 5-10 linjer om en erindring du husker tydeligt.', 'Laes 2-3 svar hoejt.',
     '{"question":"Beskriv en erindring du husker meget tydeligt. Hvad goer den saa tydelig?","placeholder":"Skriv dit svar her ..."}'::jsonb),
    (l, t, 2, 'theory_test', 'Psykologimyte: Hukommelse', 6, 'Vaelg det svar der stemmer med forskningen.', 'Vis svarfordelingen foer facit.',
     '{"theory":"Rekonstruktiv hukommelse","scenario":"Mange tror at hukommelsen fungerer som et videokamera.","question":"Hvad viser forskningen om hukommelse?","options":["Hukommelsen optager praecist som et videokamera","Hukommelsen rekonstrueres og paavirkes af forventninger","Hukommelsen er uforanderlig efter 24 timer"],"correct_option_index":1,"feedback":{"correct":"Praecis - hukommelsen rekonstrueres hver gang vi genkalder den.","incorrect":"Videokamera-metaforen foeles rigtig, men hukommelsen rekonstrueres."}}'::jsonb),
    (l, t, 3, 'case', 'Case: Vidneudsagn i retten', 14, 'Arbejd i grupper og svar paa begge spoergsmaal.', 'Kobl til Loftus.',
     '{"scenario":"Et vidne er helt sikker paa at have set gerningsmanden i en roed jakke. Videoen viser en blaa jakke.","questions":["Hvordan kan vidnet tage fejl uden at lyve?","Hvad boer retten goere med den slags udsagn?"]}'::jsonb),
    (l, t, 4, 'exit_ticket', 'Exit ticket', 8, 'Svar kort paa begge spoergsmaal inden timen slutter.', 'Brug svarene naeste gang.',
     '{"questions":["Hvad tager du med fra i dag?","Hvad er du stadig i tvivl om?"]}'::jsonb);

    INSERT INTO public.sessions (id, teacher_id, lesson_id, class_id, mode, status, join_code)
    VALUES ('11111111-2222-4333-8444-555555555002', t, l, c, 'live', 'active', 'COCK01')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Cockpit fixture skipped: expected development teacher/class not found.';
  END IF;
END $$;
