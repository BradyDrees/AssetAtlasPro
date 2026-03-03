-- 016_communications.sql
-- Unified in-app messaging foundation (threads, participants, messages, contacts, call logs, push subs)

begin;

-- Extensions (uuid gen is typically present already, but safe)
create extension if not exists "pgcrypto";

-- =========================
-- message_threads
-- =========================
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),

  thread_type text not null,
  work_order_id uuid null,
  estimate_id uuid null,
  job_id uuid null,

  title text null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  last_message_preview text null,
  last_message_at timestamptz null,
  last_message_by uuid null,

  is_archived boolean not null default false,
  is_muted boolean not null default false,

  constraint message_threads_thread_type_check
    check (thread_type in ('work_order','estimate','job','dm','group'))
);

create index if not exists message_threads_last_message_at_idx
  on public.message_threads (last_message_at desc nulls last);

create index if not exists message_threads_updated_at_idx
  on public.message_threads (updated_at desc);

create index if not exists message_threads_work_order_id_idx
  on public.message_threads (work_order_id);

create index if not exists message_threads_estimate_id_idx
  on public.message_threads (estimate_id);

create index if not exists message_threads_job_id_idx
  on public.message_threads (job_id);

-- =========================
-- thread_participants
-- =========================
create table if not exists public.thread_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null,

  role text not null,
  joined_at timestamptz not null default now(),
  added_by uuid null,

  is_muted boolean not null default false,
  last_read_at timestamptz null,

  constraint thread_participants_role_check
    check (role in ('owner','pm','vendor','maintenance','homeowner')),

  constraint thread_participants_unique_thread_user unique (thread_id, user_id)
);

create index if not exists thread_participants_thread_id_idx
  on public.thread_participants (thread_id);

create index if not exists thread_participants_user_id_idx
  on public.thread_participants (user_id);

-- =========================
-- messages
-- =========================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null,

  message_type text not null,
  body text null,

  attachments jsonb not null default '[]'::jsonb,
  read_by jsonb not null default '[]'::jsonb,

  call_duration_seconds int null,
  call_notes text null,
  voicemail_transcription text null,

  created_at timestamptz not null default now(),
  edited_at timestamptz null,
  is_deleted boolean not null default false,

  constraint messages_message_type_check
    check (message_type in ('text','media','system','call_log','voicemail')),

  constraint messages_attachments_is_array_check
    check (jsonb_typeof(attachments) = 'array'),

  constraint messages_read_by_is_array_check
    check (jsonb_typeof(read_by) = 'array')
);

create index if not exists messages_thread_id_created_at_idx
  on public.messages (thread_id, created_at desc);

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

-- =========================
-- user_contacts
-- =========================
create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null,

  relationship_source text not null,
  source_ref_id uuid null,

  contact_name text null,
  contact_role text null,
  contact_phone text null,
  contact_avatar_url text null,

  is_blocked boolean not null default false,
  is_muted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_contacts_relationship_source_check
    check (relationship_source in ('work_order','organization','manual')),

  constraint user_contacts_unique_user_contact unique (user_id, contact_id)
);

create index if not exists user_contacts_user_id_idx
  on public.user_contacts (user_id);

create index if not exists user_contacts_contact_id_idx
  on public.user_contacts (contact_id);

-- =========================
-- call_logs
-- =========================
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),

  caller_id uuid not null,
  callee_id uuid not null,

  twilio_call_sid text null,
  direction text not null,
  status text not null,

  duration_seconds int null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,

  notes text null,
  notes_added_by uuid null,
  notes_added_at timestamptz null,

  work_order_id uuid null,
  thread_id uuid null references public.message_threads(id) on delete set null,

  voicemail_url text null,
  voicemail_transcription text null,

  constraint call_logs_direction_check
    check (direction in ('inbound','outbound')),

  constraint call_logs_status_check
    check (status in ('initiated','ringing','in_progress','completed','busy','no_answer','failed','canceled','voicemail'))
);

create index if not exists call_logs_caller_id_idx
  on public.call_logs (caller_id);

create index if not exists call_logs_callee_id_idx
  on public.call_logs (callee_id);

create index if not exists call_logs_work_order_id_idx
  on public.call_logs (work_order_id);

create index if not exists call_logs_thread_id_started_at_idx
  on public.call_logs (thread_id, started_at desc);

-- =========================
-- push_subscriptions
-- =========================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  endpoint text not null,
  p256dh text not null,
  auth_key text not null,

  created_at timestamptz not null default now(),

  constraint push_subscriptions_unique_user_endpoint unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- =========================
-- updated_at triggers (simple)
-- =========================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_message_threads_updated_at on public.message_threads;
create trigger set_message_threads_updated_at
before update on public.message_threads
for each row execute procedure public.set_updated_at();

drop trigger if exists set_user_contacts_updated_at on public.user_contacts;
create trigger set_user_contacts_updated_at
before update on public.user_contacts
for each row execute procedure public.set_updated_at();

-- =========================
-- RLS
-- =========================
alter table public.message_threads enable row level security;
alter table public.thread_participants enable row level security;
alter table public.messages enable row level security;
alter table public.user_contacts enable row level security;
alter table public.call_logs enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper: is participant
create or replace function public.is_thread_participant(_thread_id uuid, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = _thread_id
      and tp.user_id = _user_id
  );
$$;

-- Threads: SELECT where user is participant
drop policy if exists "threads_select_participant" on public.message_threads;
create policy "threads_select_participant"
on public.message_threads
for select
to authenticated
using (
  public.is_thread_participant(id, auth.uid())
);

-- Threads: INSERT — any authenticated user can create a thread
drop policy if exists "threads_insert_authenticated" on public.message_threads;
create policy "threads_insert_authenticated"
on public.message_threads
for insert
to authenticated
with check (created_by = auth.uid());

-- Threads: UPDATE — participants can update thread metadata
drop policy if exists "threads_update_participant" on public.message_threads;
create policy "threads_update_participant"
on public.message_threads
for update
to authenticated
using (public.is_thread_participant(id, auth.uid()))
with check (public.is_thread_participant(id, auth.uid()));

-- Participants: SELECT where user is participant of that thread
drop policy if exists "participants_select_participant" on public.thread_participants;
create policy "participants_select_participant"
on public.thread_participants
for select
to authenticated
using (
  public.is_thread_participant(thread_id, auth.uid())
);

-- Participants: INSERT where user is participant (adding others)
drop policy if exists "participants_insert_if_participant" on public.thread_participants;
create policy "participants_insert_if_participant"
on public.thread_participants
for insert
to authenticated
with check (
  public.is_thread_participant(thread_id, auth.uid())
);

-- Participants: Bootstrap — thread creator can add themselves as first participant
drop policy if exists "participants_insert_creator_bootstrap" on public.thread_participants;
create policy "participants_insert_creator_bootstrap"
on public.thread_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.message_threads mt
    where mt.id = thread_id
      and mt.created_by = auth.uid()
  )
  and user_id = auth.uid()
);

-- Participants: UPDATE — user can update their own participant row (mute, last_read_at)
drop policy if exists "participants_update_own" on public.thread_participants;
create policy "participants_update_own"
on public.thread_participants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Messages: SELECT where user is participant
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
on public.messages
for select
to authenticated
using (
  public.is_thread_participant(thread_id, auth.uid())
);

-- Messages: INSERT where user is participant and sender_id = auth.uid()
drop policy if exists "messages_insert_sender_participant" on public.messages;
create policy "messages_insert_sender_participant"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_thread_participant(thread_id, auth.uid())
);

-- Messages: UPDATE — sender can edit their own messages
drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender"
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

-- Contacts: full control where user_id = auth.uid()
drop policy if exists "contacts_select_own" on public.user_contacts;
create policy "contacts_select_own"
on public.user_contacts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "contacts_insert_own" on public.user_contacts;
create policy "contacts_insert_own"
on public.user_contacts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "contacts_update_own" on public.user_contacts;
create policy "contacts_update_own"
on public.user_contacts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Call logs: SELECT where caller or callee = auth.uid()
drop policy if exists "call_logs_select_party" on public.call_logs;
create policy "call_logs_select_party"
on public.call_logs
for select
to authenticated
using (caller_id = auth.uid() or callee_id = auth.uid());

-- Call logs: INSERT — authenticated users can log calls
drop policy if exists "call_logs_insert_authenticated" on public.call_logs;
create policy "call_logs_insert_authenticated"
on public.call_logs
for insert
to authenticated
with check (caller_id = auth.uid() or callee_id = auth.uid());

-- Call logs: UPDATE — parties can update (for adding notes)
drop policy if exists "call_logs_update_party" on public.call_logs;
create policy "call_logs_update_party"
on public.call_logs
for update
to authenticated
using (caller_id = auth.uid() or callee_id = auth.uid())
with check (caller_id = auth.uid() or callee_id = auth.uid());

-- Push subs: SELECT/INSERT/DELETE where user_id = auth.uid()
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Enable Realtime for messages + thread_participants
-- =========================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.thread_participants;

commit;
