import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./database.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      supabase?: SupabaseClient<Database>;
    }
  }
}

export {};
