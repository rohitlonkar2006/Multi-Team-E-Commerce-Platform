insert into public.categories (name, slug, description)
values
  ('Home & Living', 'home-living', 'Everyday essentials for your home.'),
  ('Technology', 'technology', 'Useful technology for work and play.'),
  ('Fashion', 'fashion', 'Thoughtful picks for your wardrobe.')
on conflict (slug) do nothing;

with sample_products as (
  insert into public.products (
    category_id,
    sku,
    name,
    slug,
    description,
    price,
    currency,
    is_active
  )
  select
    category.id,
    sample.sku,
    sample.name,
    sample.slug,
    sample.description,
    sample.price,
    'INR',
    true
  from (
    values
      ('home-living', 'HOME-MUG-001', 'Everyday Ceramic Mug', 'everyday-ceramic-mug', 'A sturdy glazed ceramic mug for your morning coffee or tea.', 499.00, 18),
      ('home-living', 'HOME-BASKET-001', 'Linen Storage Basket', 'linen-storage-basket', 'A soft-sided woven basket for keeping everyday essentials tidy.', 1299.00, 9),
      ('home-living', 'HOME-LAMP-001', 'Studio Desk Lamp', 'studio-desk-lamp', 'A compact adjustable desk lamp with a warm, focused glow.', 2499.00, 4),
      ('technology', 'TECH-HEADPHONE-001', 'Wireless Headphones', 'wireless-headphones', 'Comfort-fit wireless headphones for work, travel, and downtime.', 3999.00, 14),
      ('fashion', 'FASH-TOTE-001', 'Everyday Canvas Tote', 'everyday-canvas-tote', 'A reusable canvas carry-all sized for daily errands.', 899.00, 0),
      ('fashion', 'FASH-SNEAKER-001', 'Classic Low-Top Sneaker', 'classic-low-top-sneaker', 'A versatile low-top sneaker with a clean, minimal profile.', 3299.00, 7)
  ) as sample(category_slug, sku, name, slug, description, price, quantity)
  join public.categories category on category.slug = sample.category_slug
  on conflict (sku) do nothing
  returning id, sku
)
update public.inventory inventory
set quantity = sample.quantity
from sample_products inserted
join (
  values
    ('HOME-MUG-001', 18),
    ('HOME-BASKET-001', 9),
    ('HOME-LAMP-001', 4),
    ('TECH-HEADPHONE-001', 14),
    ('FASH-TOTE-001', 0),
    ('FASH-SNEAKER-001', 7)
) as sample(sku, quantity) on sample.sku = inserted.sku
where inventory.product_id = inserted.id;
