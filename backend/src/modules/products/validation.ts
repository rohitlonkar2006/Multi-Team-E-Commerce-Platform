import { z } from "zod";

export const productListQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    categoryId: z.string().uuid().optional(),
    minPrice: z.coerce.number().finite().min(0).optional(),
    maxPrice: z.coerce.number().finite().min(0).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).default("newest"),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict()
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice.",
      path: ["minPrice"],
    },
  );

export const productCreateSchema = z
  .object({
    sku: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
    name: z.string().trim().min(1).max(160),
    slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    description: z.string().trim().max(5000).default(""),
    categoryId: z.string().uuid().nullable().default(null),
    price: z.number().finite().min(0).max(9999999999.99),
    currency: z.string().trim().length(3).toUpperCase().default("INR"),
    isActive: z.boolean().default(true),
    quantity: z.number().int().min(0).default(0),
  })
  .strict();

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  })
  .strict();

export const inventoryUpdateSchema = z
  .object({
    quantity: z.number().int().min(0),
  })
  .strict();

export const categoryCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().max(500).default(""),
    imageUrl: z.union([
      z.literal(""),
      z.string().trim().url().max(2048),
    ]).default("").transform((value) => value || null),
    isActive: z.boolean().default(true),
  })
  .strict();

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  })
  .strict();
