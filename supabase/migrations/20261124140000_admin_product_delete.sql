create or replace function public.admin_delete_product(p_product_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_active boolean;
  image_paths text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if not (select public.has_role(array['admin', 'super_admin'])) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select is_active into product_active
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if product_active then
    raise exception 'Remove the product from the shop before deleting it'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.cart_items
    where product_id = p_product_id
  ) then
    raise exception 'Remove the product from customer carts before deleting it'
      using errcode = 'P0001';
  end if;

  select coalesce(array_agg(storage_path), array[]::text[])
  into image_paths
  from public.product_images
  where product_id = p_product_id;

  delete from public.products where id = p_product_id;
  return image_paths;
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public, anon;
grant execute on function public.admin_delete_product(uuid) to authenticated;
