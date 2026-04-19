begin;

-- Align properties RLS with scoped capability model used by rooms/tenants.
-- Insert remains owner-only because a brand-new property has no scope row yet.
drop policy if exists properties_owner_manage on public.properties;
drop policy if exists properties_owner_select on public.properties;
drop policy if exists properties_owner_insert on public.properties;
drop policy if exists properties_owner_update on public.properties;
drop policy if exists properties_owner_delete on public.properties;

create policy properties_owner_select on public.properties
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or public.current_user_has_property_scope(properties.id)
    )
  );

create policy properties_owner_insert on public.properties
  for insert with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_role() = 'owner'
  );

create policy properties_owner_update on public.properties
  for update
  using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(properties.id, 'properties')
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(properties.id, 'properties')
  );

create policy properties_owner_delete on public.properties
  for delete using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(properties.id, 'properties')
  );

commit;
