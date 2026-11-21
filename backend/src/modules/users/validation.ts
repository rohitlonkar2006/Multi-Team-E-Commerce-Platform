import { z } from "zod";

export const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
  })
  .strict();

export const addressSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    recipientName: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(30).default(""),
    addressLine1: z.string().trim().min(1).max(160),
    addressLine2: z.string().trim().max(160).default(""),
    city: z.string().trim().min(1).max(100),
    region: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    country: z.string().trim().regex(/^[A-Za-z]{2}$/).toUpperCase().default("IN"),
  })
  .strict();

export const addressUpdateSchema = addressSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  })
  .strict();

export const addressIdSchema = z.string().uuid();
