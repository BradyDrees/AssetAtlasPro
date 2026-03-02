-- Migration 015: Enable PM writes to vendor_pm_relationships + credential read
-- Phase 6: PM Client Management + Invite Flow

begin;

-- PM can INSERT their own relationships (inviteVendor currently fails without this)
drop policy if exists vpr_pm_insert on public.vendor_pm_relationships;
create policy vpr_pm_insert
on public.vendor_pm_relationships
for insert
to authenticated
with check (
  pm_user_id = auth.uid()
);

-- PM can UPDATE their own relationships (resend/suspend/terminate/reactivate/notes/terms)
drop policy if exists vpr_pm_update on public.vendor_pm_relationships;
create policy vpr_pm_update
on public.vendor_pm_relationships
for update
to authenticated
using (
  pm_user_id = auth.uid()
)
with check (
  pm_user_id = auth.uid()
);

-- PM can read credentials for vendors where relationship exists
drop policy if exists cred_pm_read on public.vendor_credentials;
create policy cred_pm_read
on public.vendor_credentials
for select
to authenticated
using (
  exists (
    select 1
    from public.vendor_pm_relationships vpr
    where vpr.vendor_org_id = vendor_credentials.vendor_org_id
      and vpr.pm_user_id = auth.uid()
      and vpr.status in ('pending', 'active', 'suspended')
  )
);

commit;
