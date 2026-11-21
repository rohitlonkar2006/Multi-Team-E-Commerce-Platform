import { FolderTree, LogOut, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

export function SiteLayout() {
  const { session, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary" : "text-muted-foreground"}`;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-5 lg:px-10">
          <Link className="flex shrink-0 items-center gap-2.5" to="/" aria-label="ShopSphere home">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShoppingBag size={17} />
            </span>
            <span className="font-semibold tracking-tight">ShopSphere</span>
          </Link>
          <nav className="flex items-center gap-5 sm:gap-7" aria-label="Main navigation">
            <NavLink className={navClass} to="/shop">Shop</NavLink>
            {session && (
              <>
                <NavLink className={navClass} to="/cart">
                  <span className="inline-flex items-center gap-1.5"><ShoppingCart size={15} /> Cart</span>
                </NavLink>
                <NavLink className={navClass} to="/orders">Orders</NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink className={navClass} to="/admin/products">Products</NavLink>
                <NavLink className={navClass} to="/admin/categories">
                  <span className="inline-flex items-center gap-1.5"><FolderTree size={14} /> Categories</span>
                </NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/account"><UserRound size={16} /> Account</Link>
                </Button>
                <Button asChild size="icon" variant="ghost" className="sm:hidden" aria-label="Account">
                  <Link to="/account"><UserRound size={17} /></Link>
                </Button>
                <Button size="icon" variant="ghost" onClick={handleSignOut} aria-label="Sign out">
                  <LogOut size={17} />
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Join us</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        {signOutError && (
          <p role="alert" className="mx-auto max-w-7xl px-6 pb-3 text-sm text-red-700 lg:px-10">
            {signOutError}
          </p>
        )}
      </header>
      <Outlet />
      <footer className="border-t border-border/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span>ShopSphere · Multi-Team E-Commerce Platform</span>
          <span>Simulated payment only · No live banking integrations.</span>
        </div>
      </footer>
    </>
  );
}
