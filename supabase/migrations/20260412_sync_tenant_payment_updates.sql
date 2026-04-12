-- Keeps payments/dashboard in sync after tenant edits.
-- Safe to run multiple times.

create or replace function public.sync_payment_fields_after_tenant_update()
returns trigger
language plpgsql
as $$
begin
  update public.payments
  set
    tenant_name = new.name,
    room = new.room,
    property_id = new.property_id,
    monthly_rent = new.monthly_rent,
    total_amount = new.monthly_rent + coalesce(extra_charges, 0),
    updated_at = now()
  where tenant_id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_payment_fields_on_tenant_update on public.tenants;
create trigger sync_payment_fields_on_tenant_update
after update of name, room, monthly_rent, property_id on public.tenants
for each row execute procedure public.sync_payment_fields_after_tenant_update();
