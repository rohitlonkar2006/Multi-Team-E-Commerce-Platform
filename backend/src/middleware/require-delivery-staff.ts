import type { RequestHandler } from "express";
import { sendDatabaseError } from "../lib/api-error.js";

export const requireDeliveryStaff: RequestHandler = async (
  request,
  response,
  next,
) => {
  const { data, error } = await request
    .supabase!.from("user_roles")
    .select("role")
    .eq("user_id", request.authUser!.id)
    .eq("role", "delivery_staff")
    .maybeSingle();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(403).json({ error: "Delivery staff access is required." });
    return;
  }

  next();
};
