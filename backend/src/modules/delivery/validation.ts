import { z } from "zod";

export const inviteDeliveryStaffSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  serviceZone: z.string().trim().min(2).max(100),
});

export const deliveryStaffIdSchema = z.string().uuid();

export const updateDeliveryStaffSchema = z.object({
  serviceZone: z.string().trim().min(2).max(100),
  isActive: z.boolean(),
});

export const reviewLicenseSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved") }),
  z.object({
    decision: z.literal("rejected"),
    rejectionReason: z.string().trim().min(2).max(500),
  }),
]);

export const assignDeliverySchema = z.object({
  deliveryStaffId: z.string().uuid(),
});

export const deliveryStatusSchema = z.object({
  status: z.enum([
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "failed_delivery",
  ]),
  note: z.string().trim().max(500).default(""),
});
