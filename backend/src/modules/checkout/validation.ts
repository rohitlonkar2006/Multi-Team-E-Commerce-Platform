import { z } from "zod";

const idSchema = z.string().uuid();

export const cartItemSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(99),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const cartItemIdSchema = idSchema;

export const checkoutSchema = z.object({
  addressId: idSchema,
  paymentMethod: z.enum(["simulated_upi", "simulated_card", "cash_on_delivery"]),
  simulatedResult: z.enum(["success", "failed"]),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const paymentRetrySchema = z.object({
  orderId: idSchema,
  simulatedResult: z.enum(["success", "failed"]),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const orderIdSchema = idSchema;
export const paymentIdSchema = idSchema;
