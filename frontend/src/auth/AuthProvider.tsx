import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue, type AccountResponse } from "@/auth/AuthContext";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setInitializing(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "Could not restore the session.");
        setInitializing(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const accountQuery = useQuery({
    queryKey: ["account", session?.user.id],
    queryFn: () =>
      apiRequest<AccountResponse>("/auth/me", session?.access_token),
    enabled: Boolean(session?.access_token),
    retry: 1,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      account: accountQuery.data,
      loading: initializing || (Boolean(session) && accountQuery.isPending),
      configMissing: !supabase,
      error:
        authError ??
        (accountQuery.error instanceof Error ? accountQuery.error.message : null),
      isAdmin:
        accountQuery.data?.roles.some((role) => role === "admin" || role === "super_admin") ??
        false,
      async signIn(email, password) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      async signUp(email, password, fullName) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });
        if (error) throw new Error(error.message);
        return data.session !== null;
      },
      async signOut() {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      },
      async requestPasswordReset(email) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
      },
      async updatePassword(password) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
      },
      async refreshAccount() {
        if (session) await accountQuery.refetch();
      },
    }),
    [accountQuery, authError, initializing, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
