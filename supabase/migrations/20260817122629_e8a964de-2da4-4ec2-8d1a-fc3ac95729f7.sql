UPDATE public.lesson_blocks
SET content = content - 'resources'
WHERE content::text ILIKE '%example.com%' OR content::text ILIKE '%dQw4w9WgXcQ%';