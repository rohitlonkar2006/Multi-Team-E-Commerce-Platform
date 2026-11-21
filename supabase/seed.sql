insert into public.categories (name, slug, description)
values
  ('Home & Living', 'home-living', 'Everyday essentials for your home.'),
  ('Technology', 'technology', 'Useful technology for work and play.'),
  ('Fashion', 'fashion', 'Thoughtful picks for your wardrobe.'),
  ('Kitchen & Dining', 'kitchen-dining', 'Practical pieces for cooking and sharing meals.'),
  ('Beauty & Care', 'beauty-care', 'Simple daily care and personal essentials.'),
  ('Books & Stationery', 'books-stationery', 'Reading, writing, and creative desk supplies.'),
  ('Outdoor & Fitness', 'outdoor-fitness', 'Useful gear for movement and time outdoors.'),
  ('Bags & Accessories', 'bags-accessories', 'Handy carry goods and everyday accessories.'),
  ('Furniture', 'furniture', 'Well-considered furniture for compact modern spaces.'),
  ('Photography & Audio', 'photography-audio', 'Tools for capturing and sharing sound and images.')
on conflict (slug) do nothing;

with catalog_categories (
  category_slug,
  sku_prefix,
  base_price,
  price_step,
  product_note,
  image_urls,
  product_names
) as (
  values
    (
      'home-living', 'HOME', 399::numeric, 175::numeric,
      'A thoughtful home essential.',
      array[
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Soft Knit Throw',
        'Oak Side Table',
        'Ceramic Table Vase',
        'Linen Cushion Cover',
        'Woven Wall Basket',
        'Reading Floor Lamp',
        'Cotton Bath Towel Set',
        'Minimal Wall Clock',
        'Natural Wood Tray',
        'Scented Candle Set'
      ]::text[]
    ),
    (
      'technology', 'TECH', 1199::numeric, 640::numeric,
      'A reliable technology essential.',
      array[
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Bluetooth Over-Ear Headphones',
        'Portable Bluetooth Speaker',
        'Wireless Charging Pad',
        'Compact Mechanical Keyboard',
        'Ergonomic Wireless Mouse',
        'HD Webcam',
        'USB-C Multiport Hub',
        'Smart LED Desk Light',
        'Foldable Laptop Stand',
        'Digital Travel Adapter'
      ]::text[]
    ),
    (
      'fashion', 'FASH', 899::numeric, 350::numeric,
      'An easy-to-wear wardrobe staple.',
      array[
        'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Relaxed Cotton T-Shirt',
        'Everyday Denim Jacket',
        'Classic Canvas Sneakers',
        'Lightweight Crossbody Bag',
        'Soft Knit Cardigan',
        'Tailored Chino Trousers',
        'Cotton Poplin Shirt',
        'Minimal Leather Belt',
        'Weekend Slip-On Shoes',
        'Textured Scarf'
      ]::text[]
    ),
    (
      'kitchen-dining', 'KITCH', 299::numeric, 220::numeric,
      'A practical kitchen piece.',
      array[
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80&sat=-15'
      ]::text[],
      array[
        'Acacia Serving Board',
        'Double-Wall Travel Tumbler',
        'Stoneware Dinner Plate Set',
        'Glass Food Storage Set',
        'Bamboo Cooking Utensil Set',
        'Stainless Steel Water Bottle',
        'Cotton Kitchen Towel Set',
        'Pour-Over Coffee Dripper',
        'Insulated Lunch Tote',
        'Compact Spice Rack'
      ]::text[]
    ),
    (
      'beauty-care', 'BEAUTY', 299::numeric, 190::numeric,
      'A gentle personal-care staple.',
      array[
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Daily Hydration Face Cream',
        'Gentle Cleansing Balm',
        'Vitamin C Serum',
        'Botanical Hand Cream',
        'Mineral Sunscreen SPF 30',
        'Overnight Lip Mask',
        'Calming Clay Face Mask',
        'Rosewater Facial Mist',
        'Nourishing Hair Oil',
        'Soft Bristle Face Brush'
      ]::text[]
    ),
    (
      'books-stationery', 'BOOK', 199::numeric, 150::numeric,
      'A useful companion for reading and making notes.',
      array[
        'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Undated Weekly Planner',
        'Hardcover Dot Grid Notebook',
        'Writing Pen Set',
        'Watercolor Sketchbook',
        'Desk Organizer Tray',
        'Reading Journal',
        'Mechanical Pencil Set',
        'Reusable Sticky Notes',
        'Book Stand',
        'Fine Line Marker Set'
      ]::text[]
    ),
    (
      'outdoor-fitness', 'OUT', 399::numeric, 250::numeric,
      'A dependable companion for movement and the outdoors.',
      array[
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Everyday Yoga Mat',
        'Stainless Steel Gym Bottle',
        'Resistance Band Set',
        'Lightweight Running Cap',
        'Adjustable Jump Rope',
        'Compact Foam Roller',
        'Outdoor Picnic Blanket',
        'Trail Waist Pack',
        'Training Gloves',
        'Quick-Dry Gym Towel'
      ]::text[]
    ),
    (
      'bags-accessories', 'ACC', 499::numeric, 400::numeric,
      'A handy accessory for everyday carry.',
      array[
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Canvas Market Tote',
        'Structured Mini Backpack',
        'Travel Packing Cubes',
        'Zippered Tech Organizer',
        'Lightweight Weekender Bag',
        'Minimal Card Holder',
        'Reusable Produce Bags',
        'Compact Umbrella',
        'Crossbody Phone Pouch',
        'Classic Leather Key Ring'
      ]::text[]
    ),
    (
      'furniture', 'FURN', 1499::numeric, 1300::numeric,
      'A considered furnishing for a comfortable home.',
      array[
        'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Compact Writing Desk',
        'Upholstered Accent Chair',
        'Round Nesting Side Tables',
        'Slim Console Table',
        'Open Shelf Bookcase',
        'Adjustable Bar Stool',
        'Linen Storage Ottoman',
        'Bedside Drawer Unit',
        'Wooden Coat Rack',
        'Minimal Shoe Bench'
      ]::text[]
    ),
    (
      'photography-audio', 'PHOTO', 799::numeric, 850::numeric,
      'A useful tool for recording, listening, and creating.',
      array[
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
      ]::text[],
      array[
        'Compact Mirrorless Camera',
        'Portable Tripod Stand',
        'Camera Crossbody Strap',
        'USB Podcast Microphone',
        'Wireless Lavalier Mic',
        'LED Video Light Panel',
        'Camera Memory Card Case',
        'Bluetooth Shutter Remote',
        'Compact On-Camera Flash',
        'Over-Ear Studio Monitor Headphones'
      ]::text[]
    )
),
sample_products as (
  select
    category.category_slug,
    category.sku_prefix || '-' || lpad(item.ordinality::text, 3, '0') as sku,
    item.product_name as name,
    regexp_replace(lower(item.product_name), '[^a-z0-9]+', '-', 'g') as slug,
    category.product_note || ' ' || item.product_name || ' is designed for dependable everyday use.' as description,
    category.base_price + category.price_step * item.ordinality as price,
    5 + item.ordinality::integer * 2 as quantity,
    category.image_urls[
      ((item.ordinality - 1) % array_length(category.image_urls, 1) + 1)::integer
    ] as image_url
  from catalog_categories category
  cross join lateral unnest(category.product_names)
    with ordinality as item(product_name, ordinality)
),
inserted_products as (
  insert into public.products (
    category_id,
    sku,
    name,
    slug,
    description,
    price,
    currency,
    image_url,
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
    sample.image_url,
    true
  from sample_products sample
  join public.categories category on category.slug = sample.category_slug
  on conflict (sku) do nothing
  returning id, sku
),
seeded_inventory as (
  insert into public.inventory (product_id, quantity)
  select inserted.id, sample.quantity
  from inserted_products inserted
  join sample_products sample on sample.sku = inserted.sku
  on conflict (product_id) do update
  set quantity = excluded.quantity
  returning product_id
)
select count(*) as seeded_inventory_items
from seeded_inventory;

update public.products product
set image_url = sample.image_url
from (
  values
    ('HOME-MUG-001', 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=800&q=80'),
    ('HOME-BASKET-001', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'),
    ('HOME-LAMP-001', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80'),
    ('TECH-HEADPHONE-001', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'),
    ('FASH-TOTE-001', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80'),
    ('FASH-SNEAKER-001', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80')
) as sample(sku, image_url)
where product.sku = sample.sku
  and product.image_url is distinct from sample.image_url;
