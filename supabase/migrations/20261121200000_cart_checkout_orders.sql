alter table public.user_roles
  drop constraint user_roles_role_check,
  add constraint user_roles_role_check
    check (role in (
      'customer',
      'admin',
      'super_admin',
      'inventory_manager',
      'order_manager',
      'delivery_manager',
      'delivery_staff'
    ));

create or replace function public.has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = any (p_roles)
  );
$$;

revoke all on function public.has_role(text[]) from public, anon;
grant execute on function public.has_role(text[]) to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(array['admin', 'super_admin']);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index cart_items_cart_id_idx on public.cart_items (cart_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users (id) on delete restrict,
  address_id uuid references public.addresses (id) on delete set null,
  address_snapshot jsonb not null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'payment_failed'
    )),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  shipping numeric(12, 2) not null default 0 check (shipping >= 0),
  total numeric(12, 2) not null check (total = subtotal + tax + shipping),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index orders_user_created_at_idx on public.orders (user_id, created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  product_name text not null,
  image_url text,
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total = unit_price * quantity),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  method text not null
    check (method in ('simulated_upi', 'simulated_card', 'cash_on_delivery')),
  status text not null check (status in ('pending', 'success', 'failed', 'refunded')),
  amount numeric(12, 2) not null check (amount >= 0),
  transaction_reference text unique,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (order_id, idempotency_key)
);

create index payments_user_created_at_idx on public.payments (user_id, created_at desc);
create index payments_order_id_idx on public.payments (order_id, created_at desc);

create table public.inventory_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (reason in ('purchase', 'manual_adjustment', 'restock')),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_history_product_created_at_idx
  on public.inventory_history (product_id, created_at desc);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  previous_status text,
  new_status text not null,
  created_at timestamptz not null default now()
);

create index order_status_history_order_created_at_idx
  on public.order_status_history (order_id, created_at desc);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  assigned_to uuid references auth.users (id) on delete set null,
  tracking_code text not null unique,
  status text not null default 'assigned'
    check (status in ('assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery')),
  estimated_delivery_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  previous_status text,
  new_status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index delivery_status_history_delivery_created_at_idx
  on public.delivery_status_history (delivery_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_created_at_idx
  on public.notifications (user_id, is_read, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id),
  check (char_length(title) <= 120),
  check (char_length(body) <= 2000)
);

create index reviews_product_published_created_at_idx
  on public.reviews (product_id, is_published, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_created_at_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlist_items_user_created_at_idx
  on public.wishlist_items (user_id, created_at desc);

create table public.newsletter_subscriptions (
  email text primary key,
  subscribed_at timestamptz not null default now(),
  check (email = lower(btrim(email))),
  check (position('@' in email) > 1),
  check (char_length(email) <= 254)
);

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger deliveries_set_updated_at
  before update on public.deliveries
  for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_history enable row level security;
alter table public.order_status_history enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_logs enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.newsletter_subscriptions enable row level security;

grant select on public.carts, public.cart_items to authenticated;
grant select on public.orders, public.order_items, public.payments to authenticated;
grant select on public.inventory_history to authenticated;
grant select on public.order_status_history to authenticated;
grant select on public.deliveries, public.delivery_status_history to authenticated;
grant select on public.notifications, public.reviews to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert, delete on public.wishlist_items to authenticated;
grant select, insert, delete on public.reviews to authenticated;
grant update (rating, title, body) on public.reviews to authenticated;
grant select on public.reviews to anon;

create policy "Users can read their own carts"
  on public.carts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read their own cart items"
  on public.cart_items for select to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = (select auth.uid())
    )
  );

create policy "Users can read their own orders"
  on public.orders for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_role(array['admin', 'super_admin', 'order_manager']))
  );

create policy "Users can read their own order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = (select auth.uid())
          or (select public.has_role(array['admin', 'super_admin', 'order_manager']))
        )
    )
  );

create policy "Users can read their own payments"
  on public.payments for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_role(array['admin', 'super_admin', 'order_manager']))
  );

create policy "Managers can read inventory history"
  on public.inventory_history for select to authenticated
  using ((select public.has_role(array['admin', 'super_admin', 'inventory_manager'])));

create policy "Users can read their own order status history"
  on public.order_status_history for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = (select auth.uid())
          or (select public.has_role(array['admin', 'super_admin', 'order_manager']))
        )
    )
  );

create policy "Customers and delivery staff can read deliveries"
  on public.deliveries for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
    or assigned_to = (select auth.uid())
    or (select public.has_role(array['admin', 'super_admin', 'delivery_manager']))
  );

create policy "Customers and delivery staff can read delivery history"
  on public.delivery_status_history for select to authenticated
  using (
    exists (
      select 1
      from public.deliveries d
      join public.orders o on o.id = d.order_id
      where d.id = delivery_id
        and (
          o.user_id = (select auth.uid())
          or d.assigned_to = (select auth.uid())
          or (select public.has_role(array['admin', 'super_admin', 'delivery_manager']))
        )
    )
  );

create policy "Users can read and update their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications as read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Published reviews are public"
  on public.reviews for select to anon, authenticated
  using (is_published or user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users can create their own reviews"
  on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own reviews"
  on public.reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own reviews"
  on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Administrators can read audit logs"
  on public.audit_logs for select to authenticated
  using ((select public.has_role(array['admin', 'super_admin'])));

create policy "Users can manage their own wishlist"
  on public.wishlist_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.get_my_cart()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  cart_json jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'product_id', p.id,
          'name', p.name,
          'slug', p.slug,
          'sku', p.sku,
          'image_url', p.image_url,
          'price', p.price,
          'currency', p.currency,
          'quantity', ci.quantity,
          'available_stock', i.quantity
        ) order by ci.created_at
      ) filter (where ci.id is not null),
      '[]'::jsonb
    ),
    'subtotal', coalesce(sum(p.price * ci.quantity), 0)
  )
  into cart_json
  from public.carts c
  left join public.cart_items ci on ci.cart_id = c.id
  left join public.products p on p.id = ci.product_id
  left join public.inventory i on i.product_id = p.id
  where c.user_id = current_user_id;

  return coalesce(cart_json, jsonb_build_object('items', '[]'::jsonb, 'subtotal', 0));
end;
$$;

create or replace function public.get_trending_product_ids(p_limit integer default 8)
returns table(product_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select oi.product_id
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where p.is_active
    and o.status not in ('payment_failed', 'cancelled')
  group by oi.product_id
  order by sum(oi.quantity) desc, max(o.created_at) desc
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

create or replace function public.get_my_wishlist()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', wi.id,
        'product_id', p.id,
        'name', p.name,
        'slug', p.slug,
        'category_id', p.category_id,
        'category_name', c.name,
        'image_url', p.image_url,
        'price', p.price,
        'currency', p.currency,
        'is_active', p.is_active,
        'in_stock', coalesce(i.quantity > 0, false)
      ) order by wi.created_at desc
    ),
    '[]'::jsonb
  )
  from public.wishlist_items wi
  join public.products p on p.id = wi.product_id
  left join public.categories c on c.id = p.category_id
  left join public.inventory i on i.product_id = p.id
  where wi.user_id = (select auth.uid());
$$;

create or replace function public.add_to_wishlist(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and is_active
  ) then
    raise exception 'Product is unavailable' using errcode = 'P0002';
  end if;

  insert into public.wishlist_items (user_id, product_id)
  values (current_user_id, p_product_id)
  on conflict (user_id, product_id) do nothing;

  return public.get_my_wishlist();
end;
$$;

create or replace function public.remove_from_wishlist(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  delete from public.wishlist_items
  where user_id = current_user_id and product_id = p_product_id;
  return public.get_my_wishlist();
end;
$$;

create or replace function public.subscribe_newsletter(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_email text := lower(btrim(p_email));
begin
  if normalized_email is null
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(normalized_email) > 254 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  insert into public.newsletter_subscriptions (email)
  values (normalized_email)
  on conflict (email) do nothing;

  return true;
end;
$$;

create or replace function public.add_cart_item(p_product_id uuid, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_cart_id uuid;
  current_quantity integer;
  available_quantity integer;
  is_product_active boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 99 then
    raise exception 'Quantity must be between 1 and 99' using errcode = '22023';
  end if;

  insert into public.carts (user_id)
  values (current_user_id)
  on conflict (user_id) do update set updated_at = now()
  returning id into current_cart_id;

  select p.is_active, i.quantity
  into is_product_active, available_quantity
  from public.products p
  join public.inventory i on i.product_id = p.id
  where p.id = p_product_id
  for update of p, i;

  if not found or not is_product_active then
    raise exception 'Product is unavailable' using errcode = 'P0002';
  end if;

  select quantity into current_quantity
  from public.cart_items
  where cart_id = current_cart_id and product_id = p_product_id
  for update;

  if coalesce(current_quantity, 0) + p_quantity > available_quantity then
    raise exception 'Requested quantity exceeds available stock' using errcode = 'P0001';
  end if;

  insert into public.cart_items (cart_id, product_id, quantity)
  values (current_cart_id, p_product_id, p_quantity)
  on conflict (cart_id, product_id)
  do update set quantity = public.cart_items.quantity + excluded.quantity;

  return public.get_my_cart();
end;
$$;

create or replace function public.set_cart_item_quantity(p_item_id uuid, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  item_cart_id uuid;
  item_product_id uuid;
  available_quantity integer;
  is_product_active boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 99 then
    raise exception 'Quantity must be between 1 and 99' using errcode = '22023';
  end if;

  select ci.cart_id, ci.product_id, i.quantity, p.is_active
  into item_cart_id, item_product_id, available_quantity, is_product_active
  from public.cart_items ci
  join public.carts c on c.id = ci.cart_id
  join public.products p on p.id = ci.product_id
  join public.inventory i on i.product_id = p.id
  where ci.id = p_item_id and c.user_id = current_user_id
  for update of ci, p, i;

  if not found then
    raise exception 'Cart item not found' using errcode = 'P0002';
  end if;
  if not is_product_active then
    raise exception 'Product is unavailable' using errcode = 'P0002';
  end if;
  if p_quantity > available_quantity then
    raise exception 'Requested quantity exceeds available stock' using errcode = 'P0001';
  end if;

  update public.cart_items set quantity = p_quantity where id = p_item_id;
  return public.get_my_cart();
end;
$$;

create or replace function public.remove_cart_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  delete from public.cart_items ci
  using public.carts c
  where ci.cart_id = c.id
    and ci.id = p_item_id
    and c.user_id = current_user_id;

  if not found then
    raise exception 'Cart item not found' using errcode = 'P0002';
  end if;
  return public.get_my_cart();
end;
$$;

create or replace function public.checkout_cart(
  p_address_id uuid,
  p_payment_method text,
  p_idempotency_key text,
  p_simulated_result text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_cart_id uuid;
  current_order_id uuid;
  current_payment_id uuid;
  current_order_number text;
  current_status text;
  current_payment_status text;
  address_json jsonb;
  line record;
  item_count integer := 0;
  order_subtotal numeric(12, 2) := 0;
  payment_state text;
  order_state text;
  generated_reference text;
  should_capture_stock boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_payment_method not in ('simulated_upi', 'simulated_card', 'cash_on_delivery') then
    raise exception 'Payment method is invalid' using errcode = '22023';
  end if;
  if p_simulated_result not in ('success', 'failed') then
    raise exception 'Simulated payment result is invalid' using errcode = '22023';
  end if;
  if p_payment_method = 'cash_on_delivery' and p_simulated_result <> 'success' then
    raise exception 'Cash on delivery cannot have a simulated failure result' using errcode = '22023';
  end if;
  if length(btrim(p_idempotency_key)) not between 8 and 100 then
    raise exception 'Idempotency key must be between 8 and 100 characters' using errcode = '22023';
  end if;

  select o.id, o.order_number, o.status
  into current_order_id, current_order_number, current_status
  from public.orders o
  where o.user_id = current_user_id and o.idempotency_key = p_idempotency_key;

  if found then
    select p.id, p.status into current_payment_id, current_payment_status
    from public.payments p
    where p.order_id = current_order_id
    order by p.created_at desc
    limit 1;
    return jsonb_build_object(
      'order_id', current_order_id,
      'order_number', current_order_number,
      'order_status', current_status,
      'payment_id', current_payment_id,
      'payment_status', current_payment_status,
      'duplicate', true
    );
  end if;

  select c.id into current_cart_id
  from public.carts c
  where c.user_id = current_user_id
  for update;

  select o.id, o.order_number, o.status
  into current_order_id, current_order_number, current_status
  from public.orders o
  where o.user_id = current_user_id and o.idempotency_key = p_idempotency_key;

  if found then
    select p.id, p.status into current_payment_id, current_payment_status
    from public.payments p
    where p.order_id = current_order_id
    order by p.created_at desc
    limit 1;
    return jsonb_build_object(
      'order_id', current_order_id,
      'order_number', current_order_number,
      'order_status', current_status,
      'payment_id', current_payment_id,
      'payment_status', current_payment_status,
      'duplicate', true
    );
  end if;

  if current_cart_id is null then
    raise exception 'The cart is empty' using errcode = 'P0001';
  end if;

  select to_jsonb(a) into address_json
  from public.addresses a
  where a.id = p_address_id and a.user_id = current_user_id;

  if address_json is null then
    raise exception 'Delivery address not found' using errcode = 'P0002';
  end if;

  order_state := case
    when p_payment_method <> 'cash_on_delivery' and p_simulated_result = 'failed'
      then 'payment_failed'
    else 'pending'
  end;
  payment_state := case
    when p_payment_method = 'cash_on_delivery' then 'pending'
    else p_simulated_result
  end;
  should_capture_stock :=
    p_payment_method = 'cash_on_delivery' or p_simulated_result = 'success';
  current_order_number := 'SS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.orders (
    order_number, user_id, address_id, address_snapshot, status,
    currency, subtotal, tax, shipping, total, idempotency_key
  )
  values (
    current_order_number, current_user_id, p_address_id, address_json,
    order_state, 'INR', 0, 0, 0, 0, p_idempotency_key
  )
  returning id into current_order_id;

  for line in
    select ci.id as cart_item_id, ci.product_id, ci.quantity,
           p.sku, p.name, p.price, p.currency, p.image_url, p.is_active,
           i.quantity as stock_quantity
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.inventory i on i.product_id = p.id
    where ci.cart_id = current_cart_id
    order by ci.product_id
    for update of ci, p, i
  loop
    item_count := item_count + 1;
    if not line.is_active then
      raise exception 'A product in the cart is unavailable' using errcode = 'P0001';
    end if;
    if line.quantity > line.stock_quantity then
      raise exception 'Requested quantity exceeds available stock' using errcode = 'P0001';
    end if;
    if line.currency <> 'INR' then
      raise exception 'Cart contains an unsupported currency' using errcode = '22023';
    end if;

    insert into public.order_items (
      order_id, product_id, sku, product_name, image_url, quantity, unit_price, line_total
    )
    values (
      current_order_id, line.product_id, line.sku, line.name, line.image_url,
      line.quantity, line.price, line.price * line.quantity
    );
    order_subtotal := order_subtotal + line.price * line.quantity;

    if should_capture_stock then
      update public.inventory
      set quantity = quantity - line.quantity
      where product_id = line.product_id;

      insert into public.inventory_history (
        product_id, changed_by, quantity_delta, reason, order_id
      )
      values (
        line.product_id, current_user_id, -line.quantity, 'purchase', current_order_id
      );
    end if;
  end loop;

  if item_count = 0 then
    raise exception 'The cart is empty' using errcode = 'P0001';
  end if;

  update public.orders
  set subtotal = order_subtotal, total = order_subtotal
  where id = current_order_id;

  generated_reference := case
    when p_payment_method = 'cash_on_delivery' then null
    else 'SIM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
  end;

  insert into public.payments (
    order_id, user_id, method, status, amount, transaction_reference, idempotency_key
  )
  values (
    current_order_id, current_user_id, p_payment_method, payment_state,
    order_subtotal, generated_reference, p_idempotency_key
  )
  returning id into current_payment_id;

  if should_capture_stock then
    delete from public.cart_items where cart_id = current_cart_id;
  end if;

  insert into public.order_status_history (order_id, changed_by, previous_status, new_status)
  values (current_order_id, current_user_id, null, order_state);

  return jsonb_build_object(
    'order_id', current_order_id,
    'order_number', current_order_number,
    'order_status', order_state,
    'payment_id', current_payment_id,
    'payment_status', payment_state,
    'duplicate', false
  );
end;
$$;

create or replace function public.retry_simulated_payment(
  p_order_id uuid,
  p_idempotency_key text,
  p_simulated_result text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  order_row public.orders%rowtype;
  prior_payment public.payments%rowtype;
  current_payment_id uuid;
  current_payment_status text;
  line record;
  item_count integer := 0;
  expected_item_count integer := 0;
  generated_reference text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_simulated_result not in ('success', 'failed') then
    raise exception 'Simulated payment result is invalid' using errcode = '22023';
  end if;
  if length(btrim(p_idempotency_key)) not between 8 and 100 then
    raise exception 'Idempotency key must be between 8 and 100 characters' using errcode = '22023';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  select * into prior_payment
  from public.payments
  where order_id = p_order_id
  order by created_at desc
  limit 1;

  if prior_payment.id is null or prior_payment.method = 'cash_on_delivery' then
    raise exception 'This order does not support simulated payment retry' using errcode = '22023';
  end if;

  select id, status into current_payment_id, current_payment_status
  from public.payments
  where order_id = p_order_id and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'order_id', p_order_id,
      'order_number', order_row.order_number,
      'order_status', order_row.status,
      'payment_id', current_payment_id,
      'payment_status', current_payment_status,
      'duplicate', true
    );
  end if;

  if order_row.status <> 'payment_failed' then
    raise exception 'Only failed payments can be retried' using errcode = '22023';
  end if;

  if p_simulated_result = 'success' then
    select count(*) into expected_item_count
    from public.order_items
    where order_id = p_order_id;

    for line in
      select oi.product_id, oi.quantity, i.quantity as stock_quantity, p.is_active
      from public.order_items oi
      join public.inventory i on i.product_id = oi.product_id
      join public.products p on p.id = oi.product_id
      where oi.order_id = p_order_id
      order by oi.product_id
      for update of p, i
    loop
      item_count := item_count + 1;
      if not line.is_active then
        raise exception 'A product in the order is no longer available' using errcode = 'P0001';
      end if;
      if line.quantity > line.stock_quantity then
        raise exception 'Requested quantity exceeds available stock' using errcode = 'P0001';
      end if;
    end loop;

    if item_count = 0 or item_count <> expected_item_count then
      raise exception 'Order items are no longer available' using errcode = 'P0001';
    end if;
  end if;

  generated_reference := case
    when p_simulated_result = 'success'
      then 'SIM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
    else null
  end;

  insert into public.payments (
    order_id, user_id, method, status, amount, transaction_reference, idempotency_key
  )
  values (
    p_order_id, current_user_id, prior_payment.method, p_simulated_result,
    order_row.total, generated_reference, p_idempotency_key
  )
  returning id into current_payment_id;

  if p_simulated_result = 'success' then
    for line in
      select oi.product_id, oi.quantity
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null
      order by oi.product_id
    loop
      update public.inventory
      set quantity = quantity - line.quantity
      where product_id = line.product_id;

      insert into public.inventory_history (
        product_id, changed_by, quantity_delta, reason, order_id
      )
      values (
        line.product_id, current_user_id, -line.quantity, 'purchase', p_order_id
      );
    end loop;

    update public.orders set status = 'pending' where id = p_order_id;

    update public.cart_items ci
    set quantity = ci.quantity - oi.quantity
    from public.carts c, public.order_items oi
    where ci.cart_id = c.id
      and c.user_id = current_user_id
      and oi.order_id = p_order_id
      and oi.product_id = ci.product_id
      and ci.quantity > oi.quantity;

    delete from public.cart_items ci
    using public.carts c, public.order_items oi
    where ci.cart_id = c.id
      and c.user_id = current_user_id
      and oi.order_id = p_order_id
      and oi.product_id = ci.product_id
      and ci.quantity <= oi.quantity;
  end if;

  insert into public.order_status_history (order_id, changed_by, previous_status, new_status)
  values (
    p_order_id,
    current_user_id,
    order_row.status,
    case when p_simulated_result = 'success' then 'pending' else 'payment_failed' end
  );

  if p_simulated_result = 'failed' then
    update public.orders set status = 'payment_failed' where id = p_order_id;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'order_number', order_row.order_number,
    'order_status', case when p_simulated_result = 'success' then 'pending' else 'payment_failed' end,
    'payment_id', current_payment_id,
    'payment_status', p_simulated_result,
    'duplicate', false
  );
end;
$$;

create or replace function public.get_my_orders()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'status', o.status,
        'currency', o.currency,
        'subtotal', o.subtotal,
        'tax', o.tax,
        'shipping', o.shipping,
        'total', o.total,
        'address_snapshot', o.address_snapshot,
        'created_at', o.created_at,
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'sku', oi.sku,
              'product_name', oi.product_name,
              'image_url', oi.image_url,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'line_total', oi.line_total
            ) order by oi.created_at
          )
          from public.order_items oi
          where oi.order_id = o.id
        ), '[]'::jsonb),
        'payments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'method', p.method,
              'status', p.status,
              'amount', p.amount,
              'transaction_reference', p.transaction_reference,
              'created_at', p.created_at
            ) order by p.created_at
          )
          from public.payments p
          where p.order_id = o.id
        ), '[]'::jsonb),
        'delivery', (
          select jsonb_build_object(
            'id', d.id,
            'tracking_code', d.tracking_code,
            'status', d.status,
            'estimated_delivery_at', d.estimated_delivery_at
          )
          from public.deliveries d
          where d.order_id = o.id
        )
      ) order by o.created_at desc
    ),
    '[]'::jsonb
  )
  from public.orders o
  where o.user_id = (select auth.uid());
$$;

create or replace function public.get_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  dashboard_json jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if not (select public.has_role(array['admin', 'super_admin'])) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalRevenue', coalesce((
      select sum(amount) from public.payments where status = 'success'
    ), 0),
    'totalOrders', (select count(*) from public.orders),
    'totalCustomers', (
      select count(distinct user_id) from public.user_roles where role = 'customer'
    ),
    'totalProducts', (
      select count(*) from public.products where is_active
    ),
    'pendingOrders', (
      select count(*) from public.orders where status = 'pending'
    ),
    'completedOrders', (
      select count(*) from public.orders where status = 'delivered'
    ),
    'lowStockProducts', (
      select count(*) from public.inventory where quantity <= 5
    ),
    'recentOrders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recent.id,
          'order_number', recent.order_number,
          'status', recent.status,
          'total', recent.total,
          'currency', recent.currency,
          'created_at', recent.created_at
        ) order by recent.created_at desc
      )
      from (
        select id, order_number, status, total, currency, created_at
        from public.orders
        order by created_at desc
        limit 8
      ) recent
    ), '[]'::jsonb),
    'monthlyRevenue', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'month', to_char(monthly.month_start, 'Mon YYYY'),
          'revenue', coalesce(monthly.revenue, 0)
        ) order by monthly.month_start
      )
      from (
        select months.month_start, sum(p.amount) as revenue
        from generate_series(
          date_trunc('month', current_date) - interval '5 months',
          date_trunc('month', current_date),
          interval '1 month'
        ) months(month_start)
        left join public.payments p
          on p.status = 'success'
          and p.created_at >= months.month_start
          and p.created_at < months.month_start + interval '1 month'
        group by months.month_start
      ) monthly
    ), '[]'::jsonb),
    'weeklyOrders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', to_char(days.day_start, 'Dy'),
          'orders', count(o.id)
        ) order by days.day_start
      )
      from generate_series(
        current_date - interval '6 days',
        current_date,
        interval '1 day'
      ) days(day_start)
      left join public.orders o
        on o.created_at >= days.day_start
        and o.created_at < days.day_start + interval '1 day'
      group by days.day_start
    ), '[]'::jsonb),
    'salesByCategory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'category', category_sales.category,
          'revenue', category_sales.revenue
        ) order by category_sales.revenue desc
      )
      from (
        select coalesce(c.name, 'Uncategorized') as category,
               sum(oi.line_total) as revenue
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        left join public.products p on p.id = oi.product_id
        left join public.categories c on c.id = p.category_id
        where o.status not in ('payment_failed', 'cancelled')
        group by coalesce(c.name, 'Uncategorized')
        order by sum(oi.line_total) desc
        limit 6
      ) category_sales
    ), '[]'::jsonb),
    'topProducts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product', top_products.product_name,
          'quantity', top_products.quantity
        ) order by top_products.quantity desc
      )
      from (
        select oi.product_name, sum(oi.quantity) as quantity
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where o.status not in ('payment_failed', 'cancelled')
        group by oi.product_name
        order by sum(oi.quantity) desc
        limit 6
      ) top_products
    ), '[]'::jsonb),
    'paymentMethods', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'method', payment_methods.method,
          'count', payment_methods.payment_count
        ) order by payment_methods.payment_count desc
      )
      from (
        select method, count(*) as payment_count
        from public.payments
        group by method
      ) payment_methods
    ), '[]'::jsonb),
    'orderStatuses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'status', order_statuses.status,
          'count', order_statuses.order_count
        ) order by order_statuses.order_count desc
      )
      from (
        select status, count(*) as order_count
        from public.orders
        group by status
      ) order_statuses
    ), '[]'::jsonb)
  )
  into dashboard_json;

  return dashboard_json;
end;
$$;

create or replace function public.get_my_order(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select result.order_json
  from (
    select jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'currency', o.currency,
      'subtotal', o.subtotal,
      'tax', o.tax,
      'shipping', o.shipping,
      'total', o.total,
      'address_snapshot', o.address_snapshot,
      'created_at', o.created_at,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'sku', oi.sku,
            'product_name', oi.product_name,
            'image_url', oi.image_url,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'line_total', oi.line_total
          ) order by oi.created_at
        )
        from public.order_items oi
        where oi.order_id = o.id
      ), '[]'::jsonb),
      'payments', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'method', p.method,
            'status', p.status,
            'amount', p.amount,
            'transaction_reference', p.transaction_reference,
            'created_at', p.created_at
          ) order by p.created_at
        )
        from public.payments p
        where p.order_id = o.id
      ), '[]'::jsonb),
      'delivery', (
        select jsonb_build_object(
          'id', d.id,
          'tracking_code', d.tracking_code,
          'status', d.status,
          'estimated_delivery_at', d.estimated_delivery_at
        )
        from public.deliveries d
        where d.order_id = o.id
      )
    ) as order_json
    from public.orders o
    where o.id = p_order_id
      and (
        o.user_id = (select auth.uid())
        or (select public.has_role(array['admin', 'super_admin', 'order_manager']))
      )
  ) result;
$$;

create or replace function public.get_my_payment(p_payment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'order_id', p.order_id,
    'method', p.method,
    'status', p.status,
    'amount', p.amount,
    'transaction_reference', p.transaction_reference,
    'created_at', p.created_at
  )
  from public.payments p
  where p.id = p_payment_id
    and (
      p.user_id = (select auth.uid())
      or (select public.has_role(array['admin', 'super_admin', 'order_manager']))
    );
$$;

revoke all on function public.get_my_cart() from public, anon;
revoke all on function public.get_trending_product_ids(integer) from public;
revoke all on function public.get_my_wishlist() from public, anon;
revoke all on function public.add_to_wishlist(uuid) from public, anon;
revoke all on function public.remove_from_wishlist(uuid) from public, anon;
revoke all on function public.subscribe_newsletter(text) from public;
revoke all on function public.add_cart_item(uuid, integer) from public, anon;
revoke all on function public.set_cart_item_quantity(uuid, integer) from public, anon;
revoke all on function public.remove_cart_item(uuid) from public, anon;
revoke all on function public.checkout_cart(uuid, text, text, text) from public, anon;
revoke all on function public.retry_simulated_payment(uuid, text, text) from public, anon;
revoke all on function public.get_my_orders() from public, anon;
revoke all on function public.get_admin_dashboard() from public, anon;
revoke all on function public.get_my_order(uuid) from public, anon;
revoke all on function public.get_my_payment(uuid) from public, anon;
grant execute on function public.get_my_cart() to authenticated;
grant execute on function public.get_trending_product_ids(integer) to anon, authenticated;
grant execute on function public.get_my_wishlist() to authenticated;
grant execute on function public.add_to_wishlist(uuid) to authenticated;
grant execute on function public.remove_from_wishlist(uuid) to authenticated;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
grant execute on function public.add_cart_item(uuid, integer) to authenticated;
grant execute on function public.set_cart_item_quantity(uuid, integer) to authenticated;
grant execute on function public.remove_cart_item(uuid) to authenticated;
grant execute on function public.checkout_cart(uuid, text, text, text) to authenticated;
grant execute on function public.retry_simulated_payment(uuid, text, text) to authenticated;
grant execute on function public.get_my_orders() to authenticated;
grant execute on function public.get_admin_dashboard() to authenticated;
grant execute on function public.get_my_order(uuid) to authenticated;
grant execute on function public.get_my_payment(uuid) to authenticated;
