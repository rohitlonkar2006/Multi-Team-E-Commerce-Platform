export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
};

export type Product = {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number | string;
  currency: string;
  image_url: string | null;
  is_active: boolean;
  categories: Pick<Category, "id" | "name" | "slug"> | null;
  in_stock?: boolean;
  quantity?: number;
  images?: ProductImage[];
};

export type ProductImage = {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
};

export type ProductListResponse = {
  products: Product[];
  page: number;
  pageSize: number;
  total: number;
};

export function formatPrice(price: number | string, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(price));
}
