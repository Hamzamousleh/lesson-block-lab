INSERT INTO public.sessions (id, teacher_id, lesson_id, class_id, mode, status, join_code)
VALUES ('11111111-2222-4333-8444-555555555002','279c9b47-c114-4045-b594-45fe14ced6d7','11111111-2222-4333-8444-555555555001','207eaada-58ad-447a-98e1-cf4d80d87380','live','active','COCK01')
ON CONFLICT (id) DO NOTHING;