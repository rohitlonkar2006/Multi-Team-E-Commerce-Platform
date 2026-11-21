import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import { getSupabaseClient, supabase } from "../lib/supabase.js";

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.header("authorization")?.trim().split(/\s+/);
  const [scheme, token, extra] = authorization ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    response.status(401).json({ error: "Authentication is required." });
    return;
  }

  if (!supabase) {
    next(new ApiError(503, "Supabase is not configured."));
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    response.status(401).json({ error: "The access token is invalid or expired." });
    return;
  }

  request.authUser = data.user;
  request.supabase = getSupabaseClient(token);
  next();
};
