create policy "Inventory managers can read products"
  on public.products for select to authenticated
  using (
    (select public.has_role(array['admin', 'super_admin', 'inventory_manager']))
  );

create policy "Inventory managers can read inventory"
  on public.inventory for select to authenticated
  using (
    (select public.has_role(array['admin', 'super_admin', 'inventory_manager']))
  );

create policy "Inventory managers can update inventory"
  on public.inventory for update to authenticated
  using (
    (select public.has_role(array['admin', 'super_admin', 'inventory_manager']))
  )
  with check (
    (select public.has_role(array['admin', 'super_admin', 'inventory_manager']))
  );
