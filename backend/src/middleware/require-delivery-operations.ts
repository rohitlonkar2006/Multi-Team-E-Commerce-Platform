import type { RequestHandler } from "express";
import { sendDatabaseError } from "../lib/api-error.js";

export const requireDeliveryOperations: RequestHandler = async (
  request,
  response,
  next,
) => {
  const { data, error } = await request
    .supabase!.from("user_roles")
    .select("role")
    .eq("user_id", request.authUser!.id)
    .in("role", ["admin", "super_admin", "delivery_manager"])
    .limit(1)
    .maybeSingle();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(403).json({ error: "Delivery operations access is required." });
    return;
  }

  next();
};
