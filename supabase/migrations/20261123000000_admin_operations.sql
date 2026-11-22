create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_order public.orders%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if not (select public.has_role(array['admin', 'super_admin', 'order_manager'])) then
    raise exception 'Order management access is required' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'confirmed', 'processing', 'shipped', 'cancelled') then
    raise exception 'Unsupported order status' using errcode = '22023';
  end if;

  select * into current_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if current_order.status in ('out_for_delivery', 'delivered', 'cancelled', 'payment_failed') then
    raise exception 'This order can no longer be changed' using errcode = '22023';
  end if;
  if current_order.status is distinct from p_status and (
    (current_order.status = 'pending'
      and p_status not in ('confirmed', 'cancelled'))
    or (current_order.status = 'confirmed'
      and p_status not in ('processing', 'cancelled'))
    or (current_order.status = 'processing'
      and p_status not in ('shipped', 'cancelled'))
    or (current_order.status = 'shipped' and p_status <> 'cancelled')
  ) then
    raise exception 'The requested order status transition is not allowed' using errcode = '22023';
  end if;

  if current_order.status is distinct from p_status then
    update public.orders set status = p_status where id = p_order_id;
    insert into public.order_status_history (
      order_id, changed_by, previous_status, new_status
    ) values (
      p_order_id, (select auth.uid()), current_order.status, p_status
    );
  end if;

  return jsonb_build_object(
    'id', current_order.id,
    'order_number', current_order.order_number,
    'status', p_status
  );
end;
$$;

revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where lower(email) = lower('lonkarravi00@gmail.com');

  if admin_user_id is null then
    raise exception
      'Create the Supabase Auth account for lonkarravi00@gmail.com before running this migration.';
  end if;

  insert into public.user_roles (user_id, role)
  values (admin_user_id, 'admin')
  on conflict (user_id, role) do nothing;
end;
$$;
