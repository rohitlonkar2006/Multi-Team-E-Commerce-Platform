import { useQuery } from "@tanstack/react-query";
import {
  FolderTree,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { dashboardPathForRoles } from "@/auth/roles";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type CartSummary = {
  items: Array<{ quantity: number }>;
  subtotal: number;
};

type WishlistSummary = Array<{ product_id: string }>;

export function SiteLayout() {
  const { session, account, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    queryFn: () => apiRequest<{ cart: CartSummary }>("/cart", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () =>
      apiRequest<{ items: WishlistSummary }>("/wishlist", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const cartCount =
    cartQuery.data?.cart.items.reduce((count, item) => count + item.quantity, 0) ?? 0;
  const wishlistCount = wishlistQuery.data?.items.length ?? 0;

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
  const roles = account?.roles ?? [];
  const dashboardPath = dashboardPathForRoles(roles);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setSearchOpen(false);
    setMobileOpen(false);
  }

  function closeMenus() {
    setMobileOpen(false);
    setSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 lg:px-10">
          <Link className="flex shrink-0 items-center gap-2.5" to="/" aria-label="ShopSphere home">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShoppingBag size={17} />
            </span>
            <span className="font-semibold tracking-tight">ShopSphere</span>
          </Link>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
            <NavLink className={navClass} to="/">Home</NavLink>
            <NavLink className={navClass} to="/shop">Shop</NavLink>
            <Link className={navClass({ isActive: false })} to="/#categories">Categories</Link>
            <Link className={navClass({ isActive: false })} to="/#about">About</Link>
            <Link className={navClass({ isActive: false })} to="/#contact">Contact</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={searchOpen ? "Close search" : "Search products"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </Button>
            <Button asChild size="icon" variant="ghost" aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ""}`}>
              <Link to="/wishlist" onClick={closeMenus}>
                <Heart size={18} />
                {wishlistCount > 0 && <span className="sr-only">{wishlistCount} saved</span>}
                {wishlistQuery.error && (
                  <span className="sr-only">Wishlist could not be loaded</span>
                )}
              </Link>
            </Button>
            <Button asChild size="icon" variant="ghost" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}>
              <Link to="/cart" onClick={closeMenus} className="relative">
                <ShoppingCart size={18} />
                {cartQuery.data && (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
                {cartQuery.error && (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-red-700 text-[9px] font-bold text-white" title="Cart count unavailable">
                    !
                  </span>
                )}
              </Link>
            </Button>
            {session ? (
              <>
                <details className="group relative">
                  <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-white px-3 text-sm font-medium hover:border-primary/40 [&::-webkit-details-marker]:hidden">
                    <UserRound size={16} />
                    <span className="hidden xl:inline">{account?.profile?.full_name || "Profile"}</span>
                  </summary>
                  <div className="absolute right-0 top-11 z-40 grid w-52 gap-1 rounded-2xl border border-border bg-white p-2 shadow-xl">
                    <Link className="rounded-xl px-3 py-2 text-sm hover:bg-background" to={dashboardPath} onClick={closeMenus}>My Dashboard</Link>
                    <Link className="rounded-xl px-3 py-2 text-sm hover:bg-background" to="/orders" onClick={closeMenus}>My Orders</Link>
                    <Link className="rounded-xl px-3 py-2 text-sm hover:bg-background" to="/account" onClick={closeMenus}>My Profile</Link>
                    {isAdmin && (
                      <>
                        <Link className="rounded-xl px-3 py-2 text-sm hover:bg-background" to="/admin/products" onClick={closeMenus}>Product Management</Link>
                        <Link className="rounded-xl px-3 py-2 text-sm hover:bg-background" to="/admin/categories" onClick={closeMenus}><FolderTree size={14} className="mr-2 inline" />Categories</Link>
                      </>
                    )}
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" onClick={handleSignOut}>
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link className="hidden sm:inline-flex" to="/register">Join us</Link>
                </Button>
                <Button asChild size="icon" variant="ghost" className="sm:hidden" aria-label="Sign in">
                  <Link to="/login"><UserRound size={18} /></Link>
                </Button>
              </>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              className="lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </Button>
          </div>
        </div>
        {searchOpen && (
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-7xl gap-2 border-t border-border/70 px-5 py-3 lg:px-10"
          >
            <label className="sr-only" htmlFor="site-search">Search products</label>
            <input
              id="site-search"
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search the catalogue"
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-primary"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
        )}
        {mobileOpen && (
          <nav className="grid gap-1 border-t border-border/70 bg-background px-5 py-3 lg:hidden" aria-label="Mobile navigation">
            <NavLink className={navClass} to="/" onClick={closeMenus}>Home</NavLink>
            <NavLink className={navClass} to="/shop" onClick={closeMenus}>Shop</NavLink>
            <Link className={navClass({ isActive: false })} to="/#categories" onClick={closeMenus}>Categories</Link>
            <Link className={navClass({ isActive: false })} to="/#about" onClick={closeMenus}>About</Link>
            <Link className={navClass({ isActive: false })} to="/#contact" onClick={closeMenus}>Contact</Link>
            {session ? (
              <>
                <Link className={navClass({ isActive: false })} to={dashboardPath} onClick={closeMenus}>My Dashboard</Link>
                <Link className={navClass({ isActive: false })} to="/orders" onClick={closeMenus}>My Orders</Link>
              </>
            ) : (
              <>
                <Link className={navClass({ isActive: false })} to="/login" onClick={closeMenus}>Sign in</Link>
                <Link className={navClass({ isActive: false })} to="/register" onClick={closeMenus}>Join us</Link>
              </>
            )}
          </nav>
        )}
        {signOutError && (
          <p role="alert" className="mx-auto max-w-7xl px-6 pb-3 text-sm text-red-700 lg:px-10">
            {signOutError}
          </p>
        )}
      </header>
      <Outlet />
      <footer className="border-t border-border/80 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div>
            <Link className="inline-flex items-center gap-2 font-semibold" to="/">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><ShoppingBag size={15} /></span>
              ShopSphere
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              A connected multi-team e-commerce platform built around a live product catalogue.
            </p>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="mb-1 font-semibold">Explore</p>
            <Link className="text-muted-foreground hover:text-primary" to="/shop">Shop</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/#categories">Categories</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/#about">About</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/#contact">Contact</Link>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="mb-1 font-semibold">Your account</p>
            <Link className="text-muted-foreground hover:text-primary" to="/account/dashboard">Dashboard</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/orders">My orders</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/wishlist">Wishlist</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/admin/login">Staff sign in</Link>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="mb-1 font-semibold">Information</p>
            <Link className="text-muted-foreground hover:text-primary" to="/privacy">Privacy policy</Link>
            <Link className="text-muted-foreground hover:text-primary" to="/terms">Terms</Link>
            <a className="text-muted-foreground hover:text-primary" href="https://github.com/rohitlonkar2006/Multi-Team-E-Commerce-Platform" target="_blank" rel="noreferrer">GitHub project</a>
            <span className="text-xs leading-5 text-muted-foreground">Customer support is handled through the project team; no helpdesk is configured.</span>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between lg:px-10">
            <span>ShopSphere · Multi-Team E-Commerce Platform</span>
            <span>Payments are simulated; no live banking integration.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
