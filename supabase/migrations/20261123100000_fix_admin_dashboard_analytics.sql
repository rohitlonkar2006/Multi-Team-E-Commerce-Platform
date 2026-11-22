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
          'day', to_char(daily.day_start, 'Dy'),
          'orders', daily.order_count
        ) order by daily.day_start
      )
      from (
        select days.day_start, count(o.id) as order_count
        from generate_series(
          current_date - interval '6 days',
          current_date,
          interval '1 day'
        ) days(day_start)
        left join public.orders o
          on o.created_at >= days.day_start
          and o.created_at < days.day_start + interval '1 day'
        group by days.day_start
      ) daily
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

revoke all on function public.get_admin_dashboard() from public, anon;
grant execute on function public.get_admin_dashboard() to authenticated;
