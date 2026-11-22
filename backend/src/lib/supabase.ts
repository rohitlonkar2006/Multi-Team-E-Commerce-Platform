import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import type { Database } from "../types/database.js";
import { ApiError } from "./api-error.js";

export const supabaseConfigured = Boolean(
  env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY,
);

export function getSupabaseClient(accessToken?: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new ApiError(503, "Supabase is not configured. Set the project URL and publishable key.");
  }

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabase = (() => {
  const url = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
})();

export function getServiceRoleClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(
      503,
      "Admin account provisioning, delivery invitations, and private license operations require SUPABASE_SERVICE_ROLE_KEY in the backend environment.",
    );
  }

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
