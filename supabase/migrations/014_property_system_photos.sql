-- ============================================================
-- 014_property_system_photos.sql
-- Atlas Home - Property System Photos
-- Bucket: dd-captures (public read)
-- Storage path: systems/{propertyId}/{systemType}/{uuid}.jpg
-- ============================================================

create table if not exists public.property_system_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.homeowner_properties(id) on delete cascade,
  system_type text not null,
  uploaded_by uuid not null references auth.users(id) on delete set null,
  storage_path text not null,
  caption text,
  source text not null default 'homeowner',
  source_wo_id uuid references public.vendor_work_orders(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- system_type CHECK (drop-before-add, production safe)
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.property_system_photos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%system_type%';
  if cname is not null then
    execute format('alter table public.property_system_photos drop constraint %I', cname);
  end if;
end $$;

alter table public.property_system_photos
  add constraint property_system_photos_system_type_check
  check (system_type in (
    'hvac','water_heater','electrical_panel','roof','plumbing',
    'garage_door','pool','sprinkler','other'
  ));

-- source CHECK (drop-before-add, production safe)
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.property_system_photos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%source%';
  if cname is not null then
    execute format('alter table public.property_system_photos drop constraint %I', cname);
  end if;
end $$;

alter table public.property_system_photos
  add constraint property_system_photos_source_check
  check (source in ('homeowner','vendor'));

-- indexes
create index if not exists idx_psp_property_system
  on public.property_system_photos(property_id, system_type, sort_order, created_at);

create index if not exists idx_psp_source_wo
  on public.property_system_photos(source_wo_id);

alter table public.property_system_photos enable row level security;

-- Homeowner CRUD on own properties
-- IMPORTANT: homeowner_properties uses user_id = auth.uid()
do $$ begin
  create policy psp_homeowner_select
    on public.property_system_photos
    for select
    using (
      property_id in (
        select id from public.homeowner_properties
        where user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy psp_homeowner_insert
    on public.property_system_photos
    for insert
    with check (
      property_id in (
        select id from public.homeowner_properties
        where user_id = auth.uid()
      )
      and uploaded_by = auth.uid()
      and source = 'homeowner'
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy psp_homeowner_update
    on public.property_system_photos
    for update
    using (
      property_id in (
        select id from public.homeowner_properties
        where user_id = auth.uid()
      )
    )
    with check (
      property_id in (
        select id from public.homeowner_properties
        where user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy psp_homeowner_delete
    on public.property_system_photos
    for delete
    using (
      property_id in (
        select id from public.homeowner_properties
        where user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- Vendor SELECT only for properties they have WOs on
-- IMPORTANT: join via vendor_work_orders.homeowner_property_id
do $$ begin
  create policy psp_vendor_select
    on public.property_system_photos
    for select
    using (
      property_id in (
        select wo.homeowner_property_id
        from public.vendor_work_orders wo
        where wo.vendor_org_id in (
          select vendor_org_id
          from public.vendor_users
          where user_id = auth.uid() and is_active = true
        )
      )
    );
exception when duplicate_object then null; end $$;
