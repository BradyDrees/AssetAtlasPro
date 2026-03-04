-- 017_operate_capture.sql
-- Operate Inspection: learning autocomplete terms + operational tags

begin;

-- 1) inspection_terms (learning autocomplete)
create table if not exists public.inspection_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_type text not null check (term_type in ('category','location','tag')),
  term_value text not null,
  use_count int not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, term_type, term_value)
);

create index if not exists inspection_terms_user_type_use_count_idx
  on public.inspection_terms (user_id, term_type, use_count desc);

alter table public.inspection_terms enable row level security;

drop policy if exists "inspection_terms_select_own" on public.inspection_terms;
create policy "inspection_terms_select_own"
  on public.inspection_terms for select
  using (auth.uid() = user_id);

drop policy if exists "inspection_terms_insert_own" on public.inspection_terms;
create policy "inspection_terms_insert_own"
  on public.inspection_terms for insert
  with check (auth.uid() = user_id);

drop policy if exists "inspection_terms_update_own" on public.inspection_terms;
create policy "inspection_terms_update_own"
  on public.inspection_terms for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Add tags to inspection_findings (operational tags)
alter table public.inspection_findings
  add column if not exists tags text[] not null default '{}';

create index if not exists inspection_findings_tags_gin_idx
  on public.inspection_findings using gin (tags);

-- 3) Atomic upsert+increment for inspection_terms
create or replace function public.increment_term_use_count(
  p_term_type text,
  p_term_value text
)
returns public.inspection_terms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.inspection_terms;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.inspection_terms (user_id, term_type, term_value, use_count, last_used_at)
  values (v_user_id, p_term_type, p_term_value, 1, now())
  on conflict (user_id, term_type, term_value)
  do update set
    use_count = public.inspection_terms.use_count + 1,
    last_used_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.increment_term_use_count(text, text) from public;
grant execute on function public.increment_term_use_count(text, text) to authenticated;

commit;
