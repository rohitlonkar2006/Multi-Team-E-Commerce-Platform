import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

function GuardMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-6 py-16 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{children}</h1>
      </div>
    </main>
  );
}

export function RequireAuth() {
  const { session, loading, configMissing } = useAuth();
  const location = useLocation();

  if (configMissing) return <GuardMessage>Connect Supabase to use your account.</GuardMessage>;
  if (loading) return <GuardMessage>Checking your account…</GuardMessage>;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin, loading, error } = useAuth();

  if (loading) return <GuardMessage>Checking administrator access…</GuardMessage>;
  if (error) return <GuardMessage>Could not verify your account: {error}</GuardMessage>;
  if (!isAdmin) return <GuardMessage>Administrator access is required.</GuardMessage>;
  return <Outlet />;
}

export function RequireDashboardRole({ allowedRoles }: { allowedRoles: string[] }) {
  const { account, loading, error } = useAuth();

  if (loading) return <GuardMessage>Checking dashboard access…</GuardMessage>;
  if (error) return <GuardMessage>Could not verify your account: {error}</GuardMessage>;
  if (!account?.roles.some((role) => allowedRoles.includes(role))) {
    return <GuardMessage>You do not have access to this dashboard.</GuardMessage>;
  }
  return <Outlet />;
}
