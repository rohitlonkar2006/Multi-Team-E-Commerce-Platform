import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.js";
import { getSupabaseClient } from "../../lib/supabase.js";

type ProductListQuery = {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: "newest" | "price_asc" | "price_desc" | "name_asc";
  page: number;
  pageSize: number;
};

const productSelection =
  "id,category_id,sku,name,slug,description,price,currency,image_url,is_active,created_at,updated_at,categories(id,name,slug)";
const productSortColumns: Record<
  ProductListQuery["sort"],
  { column: "created_at" | "price" | "name"; ascending: boolean }
> = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  name_asc: { column: "name", ascending: true },
};

export async function listActiveProducts(filters: ProductListQuery) {
  const client = getSupabaseClient();
  let query = client
    .from("products")
    .select(productSelection, { count: "exact" })
    .eq("is_active", true);

  if (filters.q) {
    const term = filters.q.replace(/[%_*]/g, "").trim();
    if (term) query = query.ilike("name", `%${term}%`);
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);

  const { column, ascending } = productSortColumns[filters.sort];

  const from = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await query
    .order(column, { ascending })
    .range(from, from + filters.pageSize - 1);
  if (error) return { data: null, error };

  const productIds = (data ?? []).map((product) => product.id);
  const availabilityResult =
    productIds.length > 0
      ? await client
          .from("product_stock_status")
          .select("product_id,in_stock")
          .in("product_id", productIds)
      : { data: [], error: null };
  if (availabilityResult.error) {
    return { data: null, error: availabilityResult.error };
  }

  const stockById = new Map(
    (availabilityResult.data ?? []).map((stock) => [stock.product_id, stock.in_stock]),
  );
  return {
    data: {
      products: (data ?? []).map((product) => ({
        ...product,
        in_stock: stockById.get(product.id) ?? false,
      })),
      page: filters.page,
      pageSize: filters.pageSize,
      total: count ?? 0,
    },
    error: null,
  };
}

export async function getProductBySlug(slug: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("products")
    .select(productSelection)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return { data, error };

  const stock = await client
    .from("product_stock_status")
    .select("in_stock")
    .eq("product_id", data.id)
    .maybeSingle();
  if (stock.error) return { data: null, error: stock.error };

  const images = await client
    .from("product_images")
    .select("id,image_url,alt_text,is_primary")
    .eq("product_id", data.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });
  if (images.error) return { data: null, error: images.error };

  return {
    data: {
      ...data,
      in_stock: stock.data?.in_stock ?? false,
      images: images.data,
    },
    error: null,
  };
}

export async function listAdminProducts(client: SupabaseClient<Database>) {
  const { data, error } = await client
    .from("products")
    .select(productSelection)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error };

  const productIds = (data ?? []).map((product) => product.id);
  const inventoryResult =
    productIds.length > 0
      ? await client
          .from("inventory")
          .select("product_id,quantity")
          .in("product_id", productIds)
      : { data: [], error: null };
  if (inventoryResult.error) {
    return { data: null, error: inventoryResult.error };
  }

  const inventoryById = new Map(
    (inventoryResult.data ?? []).map((item) => [item.product_id, item.quantity]),
  );
  return {
    data: (data ?? []).map((product) => ({
      ...product,
      quantity: inventoryById.get(product.id) ?? 0,
    })),
    error: null,
  };
}

export async function uploadProductImage(
  client: SupabaseClient<Database>,
  productId: string,
  file: Express.Multer.File,
  altText: string,
) {
  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByMime[file.mimetype];
  if (!extension) {
    return { data: null, error: { code: "INVALID_IMAGE_TYPE" } };
  }

  const path = `${productId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from("product-images")
    .upload(path, file.buffer, {
      cacheControl: "3600",
      contentType: file.mimetype,
      upsert: false,
    });
  if (uploadError) {
    return { data: null, error: { code: "STORAGE_ERROR" } };
  }

  const imageUrl = client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  const { data: imageId, error } = await client.rpc("set_primary_product_image", {
    p_product_id: productId,
    p_storage_path: path,
    p_image_url: imageUrl,
    p_alt_text: altText,
  });

  if (error) {
    const { error: cleanupError } = await client.storage
      .from("product-images")
      .remove([path]);
    if (cleanupError) {
      console.error("Could not remove an unreferenced product image.", cleanupError.message);
    }
    return { data: null, error };
  }

  return { data: { id: imageId, image_url: imageUrl }, error: null };
}
