import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type AccountResponse = {
  user: { id: string; email: string | null };
  profile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  roles: string[];
};

export type AuthContextValue = {
  session: Session | null;
  account: AccountResponse | undefined;
  loading: boolean;
  configMissing: boolean;
  error: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
