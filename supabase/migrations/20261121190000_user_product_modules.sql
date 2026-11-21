create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  recipient_name text not null,
  phone text not null default '',
  address_line_1 text not null,
  address_line_2 text not null default '',
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null default 'IN' check (country ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(label)) > 0),
  check (length(btrim(recipient_name)) > 0),
  check (length(btrim(address_line_1)) > 0),
  check (length(btrim(city)) > 0),
  check (length(btrim(region)) > 0),
  check (length(btrim(postal_code)) > 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  image_url text not null,
  alt_text text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(alt_text) <= 160)
);

create index product_images_product_id_idx on public.product_images (product_id);
create unique index product_images_one_primary_per_product_idx
  on public.product_images (product_id)
  where is_primary;

alter table public.profiles
  add constraint profiles_full_name_length_check
  check (char_length(full_name) <= 120);

alter table public.categories
  add constraint categories_name_length_check
  check (char_length(btrim(name)) between 1 and 100),
  add constraint categories_slug_format_check
  check (char_length(slug) <= 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint categories_description_length_check
  check (char_length(description) <= 500);

alter table public.products
  add constraint products_sku_format_check
  check (char_length(sku) between 1 and 64 and sku ~ '^[A-Za-z0-9._-]+$'),
  add constraint products_name_length_check
  check (char_length(btrim(name)) between 1 and 160),
  add constraint products_slug_format_check
  check (char_length(slug) <= 180 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint products_description_length_check
  check (char_length(description) <= 5000);

alter table public.addresses
  add constraint addresses_label_length_check
  check (char_length(label) between 1 and 40),
  add constraint addresses_recipient_length_check
  check (char_length(recipient_name) between 1 and 120),
  add constraint addresses_phone_length_check
  check (char_length(phone) <= 30),
  add constraint addresses_line_lengths_check
  check (char_length(address_line_1) <= 160 and char_length(address_line_2) <= 160),
  add constraint addresses_city_region_length_check
  check (char_length(city) <= 100 and char_length(region) <= 100),
  add constraint addresses_postal_code_length_check
  check (char_length(postal_code) <= 20);

create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user_idx
  on public.addresses (user_id)
  where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

alter table public.addresses enable row level security;
alter table public.product_images enable row level security;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

create policy "Users can manage their own addresses"
  on public.addresses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Admins can manage addresses"
  on public.addresses for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Public can read active product images"
  on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.is_active
    )
    or (select public.is_admin())
  );

create policy "Admins can manage product images"
  on public.product_images for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.set_default_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.addresses
  set is_default = false
  where user_id = (select auth.uid());

  update public.addresses
  set is_default = true
  where id = p_address_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_default_address(uuid) from public, anon;
grant execute on function public.set_default_address(uuid) to authenticated;

create or replace function public.set_primary_product_image(
  p_product_id uuid,
  p_storage_path text,
  p_image_url text,
  p_alt_text text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  new_image_id uuid := gen_random_uuid();
begin
  if not (select public.is_admin()) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  update public.product_images
  set is_primary = false
  where product_id = p_product_id;

  insert into public.product_images (
    id,
    product_id,
    storage_path,
    image_url,
    alt_text,
    is_primary
  )
  values (
    new_image_id,
    p_product_id,
    p_storage_path,
    p_image_url,
    p_alt_text,
    true
  );

  update public.products
  set image_url = p_image_url
  where id = p_product_id;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  return new_image_id;
end;
$$;

revoke all on function public.set_primary_product_image(uuid, text, text, text) from public, anon;
grant execute on function public.set_primary_product_image(uuid, text, text, text) to authenticated;

create or replace function public.initialize_product_inventory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.inventory (product_id, quantity)
  values (new.id, 0)
  on conflict (product_id) do nothing;
  return new;
end;
$$;

create trigger products_initialize_inventory
  after insert on public.products
  for each row execute function public.initialize_product_inventory();

create or replace view public.product_stock_status
with (security_invoker = false)
as
  select i.product_id, (i.quantity > 0) as in_stock
  from public.inventory i
  join public.products p on p.id = i.product_id
  where p.is_active;

grant select on public.product_stock_status to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can view product image metadata"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );

create policy "Admins can upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );

create policy "Admins can delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );
