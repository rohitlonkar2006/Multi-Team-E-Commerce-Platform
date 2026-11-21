create table if not exists public.delivery_staff_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  service_zone text not null check (char_length(btrim(service_zone)) between 2 and 100),
  license_storage_path text,
  license_status text not null default 'missing'
    check (license_status in ('missing', 'pending', 'approved', 'rejected')),
  license_rejection_reason text not null default '',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_staff_profiles_zone_active_idx
  on public.delivery_staff_profiles (lower(service_zone), is_active, license_status);

drop trigger if exists delivery_staff_profiles_set_updated_at
  on public.delivery_staff_profiles;
create trigger delivery_staff_profiles_set_updated_at
  before update on public.delivery_staff_profiles
  for each row execute function public.set_updated_at();

alter table public.delivery_staff_profiles enable row level security;
grant select on public.delivery_staff_profiles to authenticated;

drop policy if exists "Delivery staff can read their own profile and admins can read all"
  on public.delivery_staff_profiles;
create policy "Delivery staff can read their own profile and admins can read all"
  on public.delivery_staff_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_role(array['admin', 'super_admin']))
  );

drop policy if exists "Customers and delivery staff can read deliveries"
  on public.deliveries;
drop policy if exists "Customers and approved delivery staff can read deliveries"
  on public.deliveries;
create policy "Customers and approved delivery staff can read deliveries"
  on public.deliveries for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
    or (
      assigned_to = (select auth.uid())
      and exists (
        select 1 from public.delivery_staff_profiles dsp
        where dsp.user_id = (select auth.uid())
          and dsp.is_active
          and dsp.license_status = 'approved'
      )
    )
    or (select public.has_role(array['admin', 'super_admin']))
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-licenses',
  'delivery-licenses',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf'];

create or replace function public.submit_delivery_license(p_storage_path text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_profile public.delivery_staff_profiles%rowtype;
begin
  if current_user_id is null
    or not (select public.has_role(array['delivery_staff'])) then
    raise exception 'Delivery staff access is required' using errcode = '42501';
  end if;

  if p_storage_path is null
    or p_storage_path not like current_user_id::text || '/%'
    or position('..' in p_storage_path) > 0 then
    raise exception 'License file path is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'delivery-licenses'
      and name = p_storage_path
  ) then
    raise exception 'License file was not found in private storage' using errcode = 'P0002';
  end if;

  select * into current_profile
  from public.delivery_staff_profiles
  where user_id = current_user_id
  for update;

  if current_profile.user_id is null then
    raise exception 'Delivery staff profile was not found' using errcode = 'P0002';
  end if;
  if current_profile.license_status not in ('missing', 'rejected') then
    raise exception 'A license is already awaiting review or approved' using errcode = 'P0001';
  end if;

  update public.delivery_staff_profiles
  set license_storage_path = p_storage_path,
      license_status = 'pending',
      license_rejection_reason = '',
      reviewed_by = null,
      reviewed_at = null
  where user_id = current_user_id;

  return jsonb_build_object('license_status', 'pending');
end;
$$;

revoke all on function public.submit_delivery_license(text) from public, anon;
grant execute on function public.submit_delivery_license(text) to authenticated;

create or replace function public.get_my_delivery_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  staff_profile public.delivery_staff_profiles%rowtype;
  assigned_orders jsonb;
begin
  if current_user_id is null
    or not (select public.has_role(array['delivery_staff'])) then
    raise exception 'Delivery staff access is required' using errcode = '42501';
  end if;

  select * into staff_profile
  from public.delivery_staff_profiles
  where user_id = current_user_id;

  if staff_profile.user_id is null then
    raise exception 'Delivery staff profile was not found' using errcode = 'P0002';
  end if;

  if staff_profile.is_active and staff_profile.license_status = 'approved' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'order_id', o.id,
          'order_number', o.order_number,
          'order_status', o.status,
          'status', d.status,
          'tracking_code', d.tracking_code,
          'created_at', d.created_at,
          'total', o.total,
          'currency', o.currency,
          'payment_method', (
            select p.method
            from public.payments p
            where p.order_id = o.id
            order by p.created_at desc
            limit 1
          ),
          'address', jsonb_build_object(
            'recipient_name', o.address_snapshot ->> 'recipient_name',
            'phone', o.address_snapshot ->> 'phone',
            'address_line_1', o.address_snapshot ->> 'address_line_1',
            'address_line_2', o.address_snapshot ->> 'address_line_2',
            'city', o.address_snapshot ->> 'city',
            'region', o.address_snapshot ->> 'region',
            'postal_code', o.address_snapshot ->> 'postal_code',
            'country', o.address_snapshot ->> 'country'
          ),
          'items', (
            select coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'product_name', oi.product_name,
                  'quantity', oi.quantity
                ) order by oi.created_at
              ),
              '[]'::jsonb
            )
            from public.order_items oi
            where oi.order_id = o.id
          )
        ) order by d.created_at desc
      ),
      '[]'::jsonb
    )
    into assigned_orders
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.assigned_to = current_user_id
      and lower(btrim(staff_profile.service_zone)) in (
        lower(btrim(coalesce(o.address_snapshot ->> 'city', ''))),
        lower(btrim(coalesce(o.address_snapshot ->> 'postal_code', '')))
      );
  else
    assigned_orders := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'full_name', staff_profile.full_name,
      'service_zone', staff_profile.service_zone,
      'license_status', staff_profile.license_status,
      'license_rejection_reason', staff_profile.license_rejection_reason,
      'is_active', staff_profile.is_active
    ),
    'deliveries', assigned_orders
  );
end;
$$;

revoke all on function public.get_my_delivery_dashboard() from public, anon;
grant execute on function public.get_my_delivery_dashboard() to authenticated;

create or replace function public.get_admin_delivery_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  queue jsonb;
begin
  if not (select public.has_role(array['admin', 'super_admin', 'delivery_manager'])) then
    raise exception 'Delivery operations access is required' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'status', o.status,
        'created_at', o.created_at,
        'total', o.total,
        'currency', o.currency,
        'address', jsonb_build_object(
          'recipient_name', o.address_snapshot ->> 'recipient_name',
          'phone', o.address_snapshot ->> 'phone',
          'address_line_1', o.address_snapshot ->> 'address_line_1',
          'address_line_2', o.address_snapshot ->> 'address_line_2',
          'city', o.address_snapshot ->> 'city',
          'region', o.address_snapshot ->> 'region',
          'postal_code', o.address_snapshot ->> 'postal_code',
          'country', o.address_snapshot ->> 'country'
        ),
        'delivery', case when d.id is null then null else jsonb_build_object(
          'id', d.id,
          'assigned_to', d.assigned_to,
          'status', d.status,
          'tracking_code', d.tracking_code
        ) end
      ) order by o.created_at desc
    ),
    '[]'::jsonb
  )
  into queue
  from public.orders o
  left join public.deliveries d on d.order_id = o.id
  where o.status not in ('delivered', 'cancelled', 'payment_failed');

  return queue;
end;
$$;

revoke all on function public.get_admin_delivery_queue() from public, anon;
grant execute on function public.get_admin_delivery_queue() to authenticated;

create or replace function public.get_assignable_delivery_staff()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  staff_list jsonb;
begin
  if not (select public.has_role(array['admin', 'super_admin', 'delivery_manager'])) then
    raise exception 'Delivery operations access is required' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', dsp.user_id,
        'full_name', dsp.full_name,
        'service_zone', dsp.service_zone,
        'license_status', dsp.license_status,
        'is_active', dsp.is_active
      ) order by dsp.full_name
    ),
    '[]'::jsonb
  )
  into staff_list
  from public.delivery_staff_profiles dsp
  where dsp.is_active
    and dsp.license_status = 'approved'
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = dsp.user_id and ur.role = 'delivery_staff'
    );

  return staff_list;
end;
$$;

revoke all on function public.get_assignable_delivery_staff() from public, anon;
grant execute on function public.get_assignable_delivery_staff() to authenticated;

create or replace function public.admin_assign_delivery(
  p_order_id uuid,
  p_delivery_staff_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_order public.orders%rowtype;
  current_delivery public.deliveries%rowtype;
  staff public.delivery_staff_profiles%rowtype;
  customer_city text;
  customer_postal_code text;
  tracking text;
  previous_delivery_status text;
begin
  if not (select public.has_role(array['admin', 'super_admin', 'delivery_manager'])) then
    raise exception 'Delivery operations access is required' using errcode = '42501';
  end if;

  select * into current_order
  from public.orders
  where id = p_order_id
  for update;
  if current_order.id is null
    or current_order.status in ('delivered', 'cancelled', 'payment_failed') then
    raise exception 'Order is not available for delivery assignment' using errcode = 'P0002';
  end if;

  select * into staff
  from public.delivery_staff_profiles
  where user_id = p_delivery_staff_id
  for update;
  if staff.user_id is null
    or not staff.is_active
    or staff.license_status <> 'approved'
    or not exists (
      select 1 from public.user_roles ur
      where ur.user_id = p_delivery_staff_id and ur.role = 'delivery_staff'
    ) then
    raise exception 'Choose an active delivery staff member with an approved license' using errcode = '22023';
  end if;

  customer_city := lower(btrim(coalesce(current_order.address_snapshot ->> 'city', '')));
  customer_postal_code := lower(btrim(coalesce(current_order.address_snapshot ->> 'postal_code', '')));
  if lower(btrim(staff.service_zone)) not in (customer_city, customer_postal_code) then
    raise exception 'Delivery staff service zone must match the order city or postal code' using errcode = '22023';
  end if;

  select * into current_delivery
  from public.deliveries
  where order_id = p_order_id
  for update;

  if current_delivery.id is not null and current_delivery.status <> 'assigned' then
    if current_delivery.status <> 'failed_delivery'
      and exists (
        select 1
        from public.delivery_staff_profiles prior_staff
        where prior_staff.user_id = current_delivery.assigned_to
          and prior_staff.is_active
          and prior_staff.license_status = 'approved'
      ) then
      raise exception 'An in-progress delivery cannot be reassigned' using errcode = 'P0001';
    end if;
  end if;

  if current_delivery.id is null then
    tracking := 'SS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    insert into public.deliveries (order_id, assigned_to, tracking_code)
    values (p_order_id, p_delivery_staff_id, tracking)
    returning * into current_delivery;
    insert into public.delivery_status_history (delivery_id, changed_by, new_status, note)
    values (current_delivery.id, auth.uid(), 'assigned', 'Assigned by administrator');
  else
    previous_delivery_status := current_delivery.status;
    update public.deliveries
    set assigned_to = p_delivery_staff_id,
        status = 'assigned'
    where id = current_delivery.id
    returning * into current_delivery;
    insert into public.delivery_status_history (
      delivery_id, changed_by, previous_status, new_status, note
    )
    values (
      current_delivery.id, auth.uid(), previous_delivery_status,
      'assigned', 'Assignment updated by administrator'
    );
  end if;

  return jsonb_build_object(
    'delivery_id', current_delivery.id,
    'tracking_code', current_delivery.tracking_code,
    'assigned_to', current_delivery.assigned_to,
    'status', current_delivery.status
  );
end;
$$;

revoke all on function public.admin_assign_delivery(uuid, uuid) from public, anon;
grant execute on function public.admin_assign_delivery(uuid, uuid) to authenticated;

create or replace function public.admin_update_delivery_staff(
  p_delivery_staff_id uuid,
  p_service_zone text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_profile public.delivery_staff_profiles%rowtype;
begin
  if not (select public.has_role(array['admin', 'super_admin'])) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_service_zone, ''))) not between 2 and 100 then
    raise exception 'Service zone must be between 2 and 100 characters' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.assigned_to = p_delivery_staff_id
      and d.status not in ('delivered', 'failed_delivery')
      and lower(btrim(p_service_zone)) not in (
        lower(btrim(coalesce(o.address_snapshot ->> 'city', ''))),
        lower(btrim(coalesce(o.address_snapshot ->> 'postal_code', '')))
      )
  ) then
    raise exception 'Service zone cannot change while active deliveries are outside the new zone' using errcode = 'P0001';
  end if;

  update public.delivery_staff_profiles
  set service_zone = btrim(p_service_zone),
      is_active = p_is_active
  where user_id = p_delivery_staff_id
  returning * into updated_profile;

  if updated_profile.user_id is null then
    raise exception 'Delivery staff profile was not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'user_id', updated_profile.user_id,
    'service_zone', updated_profile.service_zone,
    'is_active', updated_profile.is_active
  );
end;
$$;

revoke all on function public.admin_update_delivery_staff(uuid, text, boolean) from public, anon;
grant execute on function public.admin_update_delivery_staff(uuid, text, boolean) to authenticated;

create or replace function public.admin_review_delivery_license(
  p_delivery_staff_id uuid,
  p_decision text,
  p_rejection_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_profile public.delivery_staff_profiles%rowtype;
begin
  if not (select public.has_role(array['admin', 'super_admin'])) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'License decision must be approved or rejected' using errcode = '22023';
  end if;
  if p_decision = 'rejected'
    and char_length(btrim(coalesce(p_rejection_reason, ''))) not between 2 and 500 then
    raise exception 'A rejection reason between 2 and 500 characters is required' using errcode = '22023';
  end if;

  update public.delivery_staff_profiles
  set license_status = p_decision,
      license_rejection_reason = case
        when p_decision = 'rejected' then btrim(p_rejection_reason)
        else ''
      end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where user_id = p_delivery_staff_id
    and license_storage_path is not null
    and license_status = 'pending'
  returning * into updated_profile;

  if updated_profile.user_id is null then
    raise exception 'No pending license was found for this delivery staff member' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'user_id', updated_profile.user_id,
    'license_status', updated_profile.license_status,
    'license_rejection_reason', updated_profile.license_rejection_reason,
    'reviewed_at', updated_profile.reviewed_at
  );
end;
$$;

revoke all on function public.admin_review_delivery_license(uuid, text, text) from public, anon;
grant execute on function public.admin_review_delivery_license(uuid, text, text) to authenticated;

create or replace function public.update_assigned_delivery_status(
  p_delivery_id uuid,
  p_status text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_delivery public.deliveries%rowtype;
  previous_delivery_status text;
  previous_order_status text;
  next_order_status text;
begin
  if current_user_id is null
    or not (select public.has_role(array['delivery_staff'])) then
    raise exception 'Delivery staff access is required' using errcode = '42501';
  end if;

  select d.* into current_delivery
  from public.deliveries d
  join public.delivery_staff_profiles dsp on dsp.user_id = d.assigned_to
  where d.id = p_delivery_id
    and d.assigned_to = current_user_id
    and dsp.is_active
    and dsp.license_status = 'approved'
  for update of d;

  if current_delivery.id is null then
    raise exception 'Assigned delivery was not found' using errcode = 'P0002';
  end if;

  if not (
    (current_delivery.status = 'assigned' and p_status = 'picked_up')
    or (current_delivery.status = 'picked_up' and p_status = 'in_transit')
    or (current_delivery.status = 'in_transit' and p_status = 'out_for_delivery')
    or (current_delivery.status = 'out_for_delivery' and p_status in ('delivered', 'failed_delivery'))
  ) then
    raise exception 'Delivery status transition is not allowed' using errcode = '22023';
  end if;
  previous_delivery_status := current_delivery.status;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Delivery note must be 500 characters or fewer' using errcode = '22023';
  end if;
  if p_status = 'failed_delivery'
    and char_length(btrim(coalesce(p_note, ''))) < 2 then
    raise exception 'Add a short reason when reporting a failed delivery' using errcode = '22023';
  end if;

  update public.deliveries
  set status = p_status
  where id = current_delivery.id
  returning * into current_delivery;

  insert into public.delivery_status_history (
    delivery_id, changed_by, previous_status, new_status, note
  )
  values (
    current_delivery.id, current_user_id, previous_delivery_status, p_status, btrim(coalesce(p_note, ''))
  );

  next_order_status := case
    when p_status in ('picked_up', 'in_transit') then 'shipped'
    when p_status = 'out_for_delivery' then 'out_for_delivery'
    when p_status = 'delivered' then 'delivered'
    else null
  end;
  if next_order_status is not null then
    select status into previous_order_status
    from public.orders
    where id = current_delivery.order_id
    for update;

    if previous_order_status is distinct from next_order_status then
      update public.orders
      set status = next_order_status
      where id = current_delivery.order_id
        and status not in ('delivered', 'cancelled', 'payment_failed');

      if found then
        insert into public.order_status_history (
          order_id, changed_by, previous_status, new_status
        )
        values (
          current_delivery.order_id, current_user_id, previous_order_status, next_order_status
        );
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'delivery_id', current_delivery.id,
    'status', current_delivery.status
  );
end;
$$;

revoke all on function public.update_assigned_delivery_status(uuid, text, text) from public, anon;
grant execute on function public.update_assigned_delivery_status(uuid, text, text) to authenticated;
