import type { RequestHandler } from "express";
import { z } from "zod";
import { sendDatabaseError } from "../../lib/api-error.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  inventoryUpdateSchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
} from "./validation.js";
import {
  getProductBySlug,
  listActiveProducts,
  listAdminProducts,
  uploadProductImage,
} from "./service.js";

const productSlugSchema = z.string().min(1).max(180);
const uuidSchema = z.string().uuid();

function validationError(
  response: import("express").Response,
  details: unknown,
): void {
  response.status(400).json({ error: "Invalid request data.", details });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const listProducts: RequestHandler = async (request, response) => {
  const parsed = productListQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const result = await listActiveProducts(parsed.data);
  if (result.error) {
    sendDatabaseError(response, result.error);
    return;
  }
  response.json(result.data);
};

export const getProduct: RequestHandler = async (request, response) => {
  const slug = productSlugSchema.safeParse(request.params.slug);
  if (!slug.success) {
    validationError(response, slug.error.flatten());
    return;
  }

  const result = await getProductBySlug(slug.data);
  if (result.error) {
    sendDatabaseError(response, result.error);
    return;
  }
  if (!result.data) {
    response.status(404).json({ error: "Product not found." });
    return;
  }
  response.json({ product: result.data });
};

export const listAdminProductsController: RequestHandler = async (request, response) => {
  const result = await listAdminProducts(request.supabase!);
  if (result.error) {
    sendDatabaseError(response, result.error);
    return;
  }
  response.json({ products: result.data });
};

export const createProduct: RequestHandler = async (request, response) => {
  const parsed = productCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const value = parsed.data;
  const slug = value.slug || slugify(value.name);
  if (!slug) {
    response.status(400).json({ error: "Product name must contain letters or numbers." });
    return;
  }

  const client = request.supabase!;
  const { data, error } = await client
    .from("products")
    .insert({
      sku: value.sku,
      name: value.name,
      slug,
      description: value.description,
      category_id: value.categoryId,
      price: value.price,
      currency: value.currency,
      is_active: value.isActive,
    })
    .select("id,category_id,sku,name,slug,description,price,currency,image_url,is_active,created_at,updated_at")
    .single();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }

  const inventory = await client
    .from("inventory")
    .update({ quantity: value.quantity })
    .eq("product_id", data.id)
    .select("product_id,quantity")
    .maybeSingle();
  if (inventory.error) {
    sendDatabaseError(response, inventory.error);
    return;
  }
  if (!inventory.data) {
    response.status(500).json({ error: "Product inventory was not initialized." });
    return;
  }

  response.status(201).json({
    product: { ...data, quantity: inventory.data.quantity },
  });
};

export const updateProduct: RequestHandler = async (request, response) => {
  const id = uuidSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }
  const parsed = productUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const value = parsed.data;
  const slug =
    value.slug ??
    (value.name !== undefined ? slugify(value.name) : undefined);
  if (slug === "" || (value.slug !== undefined && !slug)) {
    response.status(400).json({ error: "Product name must contain letters or numbers." });
    return;
  }
  const productChanges = {
    ...(value.sku !== undefined ? { sku: value.sku } : {}),
    ...(value.name !== undefined ? { name: value.name } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(value.description !== undefined ? { description: value.description } : {}),
    ...(value.categoryId !== undefined ? { category_id: value.categoryId } : {}),
    ...(value.price !== undefined ? { price: value.price } : {}),
    ...(value.currency !== undefined ? { currency: value.currency } : {}),
    ...(value.isActive !== undefined ? { is_active: value.isActive } : {}),
  };

  const client = request.supabase!;
  const existing = await client
    .from("products")
    .select("id,category_id,sku,name,slug,description,price,currency,image_url,is_active,created_at,updated_at")
    .eq("id", id.data)
    .maybeSingle();
  if (existing.error) {
    sendDatabaseError(response, existing.error);
    return;
  }
  if (!existing.data) {
    response.status(404).json({ error: "Product not found." });
    return;
  }

  let data = existing.data;
  if (Object.keys(productChanges).length > 0) {
    const updated = await client
      .from("products")
      .update(productChanges)
      .eq("id", id.data)
      .select("id,category_id,sku,name,slug,description,price,currency,image_url,is_active,created_at,updated_at")
      .maybeSingle();
    if (updated.error) {
      sendDatabaseError(response, updated.error);
      return;
    }
    if (!updated.data) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    data = updated.data;
  }

  let quantity: number | undefined;
  if (value.quantity !== undefined) {
    const inventory = await client
      .from("inventory")
      .update({ quantity: value.quantity })
      .eq("product_id", data.id)
      .select("quantity")
      .maybeSingle();
    if (inventory.error) {
      sendDatabaseError(response, inventory.error);
      return;
    }
    if (!inventory.data) {
      response.status(500).json({ error: "Product inventory could not be updated." });
      return;
    }
    quantity = inventory.data.quantity;
  }

  response.json({ product: { ...data, ...(quantity !== undefined ? { quantity } : {}) } });
};

export const deleteProduct: RequestHandler = async (request, response) => {
  const id = uuidSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }
  const { data, error } = await request
    .supabase!.from("products")
    .update({ is_active: false })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(404).json({ error: "Product not found." });
    return;
  }
  response.status(204).end();
};

export const updateInventory: RequestHandler = async (request, response) => {
  const id = uuidSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }
  const parsed = inventoryUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const { data, error } = await request
    .supabase!.from("inventory")
    .update({ quantity: parsed.data.quantity })
    .eq("product_id", id.data)
    .select("product_id,quantity,updated_at")
    .maybeSingle();
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(404).json({ error: "Product inventory not found." });
    return;
  }
  response.json({ inventory: data });
};

export const uploadImage: RequestHandler = async (request, response) => {
  const id = uuidSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }
  if (!request.file) {
    response.status(400).json({ error: "Choose an image file to upload." });
    return;
  }

  const client = request.supabase!;
  const product = await client
    .from("products")
    .select("id,name")
    .eq("id", id.data)
    .maybeSingle();
  if (product.error) {
    sendDatabaseError(response, product.error);
    return;
  }
  if (!product.data) {
    response.status(404).json({ error: "Product not found." });
    return;
  }

  const result = await uploadProductImage(
    client,
    product.data.id,
    request.file,
    product.data.name,
  );
  if (result.error) {
    if (result.error.code === "INVALID_IMAGE_TYPE") {
      response.status(400).json({ error: "Upload a JPEG, PNG, or WebP image." });
    } else if (result.error.code === "STORAGE_ERROR") {
      response.status(502).json({ error: "Product image storage could not complete the upload." });
    } else {
      sendDatabaseError(response, result.error);
    }
    return;
  }
  response.json({ imageUrl: result.data.image_url });
};

export const listCategories: RequestHandler = async (_request, response) => {
  const { data, error } = await getSupabaseClient()
    .from("categories")
    .select("id,name,slug,description,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("name");
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ categories: data });
};

export const listAdminCategories: RequestHandler = async (request, response) => {
  const { data, error } = await request
    .supabase!.from("categories")
    .select("id,name,slug,description,is_active,created_at,updated_at")
    .order("name");
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ categories: data });
};

export const createCategory: RequestHandler = async (request, response) => {
  const parsed = categoryCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const value = parsed.data;
  const { data, error } = await request
    .supabase!.from("categories")
    .insert({
      name: value.name,
      slug: value.slug,
      description: value.description,
      is_active: value.isActive,
    })
    .select("id,name,slug,description,is_active,created_at,updated_at")
    .single();
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(201).json({ category: data });
};

export const updateCategory: RequestHandler = async (request, response) => {
  const id = uuidSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }
  const parsed = categoryUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const value = parsed.data;
  const { data, error } = await request
    .supabase!.from("categories")
    .update({
      ...(value.name !== undefined ? { name: value.name } : {}),
      ...(value.slug !== undefined ? { slug: value.slug } : {}),
      ...(value.description !== undefined ? { description: value.description } : {}),
      ...(value.isActive !== undefined ? { is_active: value.isActive } : {}),
    })
    .eq("id", id.data)
    .select("id,name,slug,description,is_active,created_at,updated_at")
    .maybeSingle();
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(404).json({ error: "Category not found." });
    return;
  }
  response.json({ category: data });
};

export const deleteCategory: RequestHandler = async (request, response) => {
  const id = uuidSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }
  const { data, error } = await request
    .supabase!.from("categories")
    .update({ is_active: false })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(404).json({ error: "Category not found." });
    return;
  }
  response.status(204).end();
};

