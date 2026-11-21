import type { RequestHandler } from "express";
import { sendDatabaseError } from "../lib/api-error.js";

export const requireAdmin: RequestHandler = async (request, response, next) => {
  const user = request.authUser;
  const client = request.supabase;

  if (!user || !client) {
    response.status(401).json({ error: "Authentication is required." });
    return;
  }

  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin"])
    .maybeSingle();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }

  if (!data) {
    response.status(403).json({ error: "Administrator access is required." });
    return;
  }

  next();
};
