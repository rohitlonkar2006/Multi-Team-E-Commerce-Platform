import type { RequestHandler } from "express";
import { sendDatabaseError } from "../lib/api-error.js";
import type { Database } from "../types/database.js";

type Role = Database["public"]["Tables"]["user_roles"]["Row"]["role"];

export function requireRoles(roles: Role[], message: string): RequestHandler {
  return async (request, response, next) => {
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
      .in("role", roles)
      .limit(1)
      .maybeSingle();

    if (error) {
      sendDatabaseError(response, error);
      return;
    }
    if (!data) {
      response.status(403).json({ error: message });
      return;
    }

    next();
  };
}
