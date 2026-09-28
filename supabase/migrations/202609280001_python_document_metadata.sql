-- Add optional library metadata without changing existing rows or RLS policies.
begin;

alter table public.python_documents
  add column code_type text,
  add column topic text;

alter table public.python_documents
  add constraint python_documents_code_type_check
    check (code_type is null or code_type in ('Cours', 'Entraînement', 'Projet', 'Référence')),
  add constraint python_documents_topic_check
    check (topic is null or (char_length(btrim(topic)) between 1 and 60 and topic = btrim(topic)));

grant insert (code_type, topic) on public.python_documents to authenticated;
grant update (code_type, topic) on public.python_documents to authenticated;

commit;
