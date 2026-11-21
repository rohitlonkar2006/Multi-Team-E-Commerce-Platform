import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, PackageOpen, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { formatPrice, type Product } from "@/modules/products/types";

export function ProductCard({ product }: { product: Product }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);

  const addToCart = useMutation({
    mutationFn: () =>
      apiRequest("/cart/items", session?.access_token, {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] }),
  });
  const addToWishlist = useMutation({
    mutationFn: () =>
      apiRequest("/wishlist", session?.access_token, {
        method: "POST",
        body: JSON.stringify({ productId: product.id }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["wishlist", session?.user.id] }),
  });

  function requireSignIn() {
    navigate("/login", { state: { from: location.pathname } });
  }

  const error = addToCart.error ?? addToWishlist.error;

  return (
    <article className="dashboard-card reveal-on-load group min-w-0 overflow-hidden rounded-2xl border border-border bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary/60">
        <Link to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
          {product.image_url && !imageFailed ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center text-primary/70" role="img" aria-label={`${product.name} image unavailable`}>
              <div className="grid justify-items-center gap-2">
                <PackageOpen size={28} strokeWidth={1.5} />
                <span className="text-xs font-medium">{product.categories?.name ?? "ShopSphere"}</span>
              </div>
            </div>
          )}
        </Link>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={`Add ${product.name} to wishlist`}
          className="absolute right-3 top-3 rounded-full shadow-sm"
          disabled={addToWishlist.isPending}
          onClick={() => (session ? addToWishlist.mutate() : requireSignIn())}
        >
          <Heart size={16} />
        </Button>
      </div>
      <div className="p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {product.categories?.name ?? "ShopSphere collection"}
        </p>
        <Link to={`/products/${product.slug}`} className="mt-1 block font-semibold tracking-tight hover:text-primary">
          {product.name}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{formatPrice(product.price, product.currency)}</p>
          <span className={`text-xs ${product.in_stock ? "text-primary" : "text-muted-foreground"}`}>
            {product.in_stock ? "In stock" : "Out of stock"}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-4 w-full"
          disabled={!product.in_stock || addToCart.isPending}
          onClick={() => (session ? addToCart.mutate() : requireSignIn())}
        >
          <ShoppingCart size={15} />
          {addToCart.isPending ? "Adding..." : "Add to cart"}
        </Button>
        {addToCart.isSuccess && (
          <p role="status" className="mt-2 text-center text-xs text-primary">Added to your cart.</p>
        )}
        {addToWishlist.isSuccess && (
          <p role="status" className="mt-2 text-center text-xs text-primary">Saved to your wishlist.</p>
        )}
        {error instanceof Error && (
          <p role="alert" className="mt-2 text-center text-xs text-red-700">{error.message}</p>
        )}
      </div>
    </article>
  );
}
