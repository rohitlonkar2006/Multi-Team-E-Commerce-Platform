update public.products
set
  image_url = 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
  updated_at = now()
where lower(name) = 'canvas market tote';

update public.product_images image
set
  image_url = 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
  is_primary = true
from public.products product
where image.product_id = product.id
  and lower(product.name) = 'canvas market tote'
  and image.is_primary = true;
