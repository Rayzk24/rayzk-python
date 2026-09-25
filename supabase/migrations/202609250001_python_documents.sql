-- Rayzk Python V1. Additive migration: no dashboard tables/functions are changed.
begin;

create table public.python_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('draft', 'saved')),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  content text not null default '' check (octet_length(content) <= 1048576),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index python_one_draft_per_user on public.python_documents(user_id) where kind = 'draft';
create index python_documents_recent on public.python_documents(user_id, updated_at desc);

create function public.python_documents_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.user_id <> old.user_id or new.kind <> old.kind then
    raise exception 'Document identity is immutable';
  end if;
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  new.created_at := old.created_at;
  return new;
end;
$$;
revoke all on function public.python_documents_touch() from public, anon, authenticated;
create trigger python_documents_touch before update on public.python_documents
for each row execute function public.python_documents_touch();

alter table public.python_documents enable row level security;
alter table public.python_documents force row level security;
revoke all on public.python_documents from public, anon, authenticated;
grant select, delete on public.python_documents to authenticated;
grant insert (id, user_id, kind, name, content) on public.python_documents to authenticated;
grant update (name, content) on public.python_documents to authenticated;

create policy python_select_own on public.python_documents for select to authenticated
using ((select auth.uid()) = user_id);
create policy python_insert_own on public.python_documents for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy python_update_own on public.python_documents for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy python_delete_own on public.python_documents for delete to authenticated
using ((select auth.uid()) = user_id);

commit;
