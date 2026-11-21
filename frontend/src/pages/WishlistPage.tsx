import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import type { Product } from "@/modules/products/types";

type WishlistItem = {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  category_id: string | null;
  category_name: string | null;
  image_url: string | null;
  price: number;
  currency: string;
  is_active: boolean;
  in_stock: boolean;
};

export function WishlistPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () =>
      apiRequest<{ items: WishlistItem[] }>("/wishlist", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const removeItem = useMutation({
    mutationFn: (productId: string) =>
      apiRequest<{ items: WishlistItem[] }>(`/wishlist/${productId}`, session?.access_token, {
        method: "DELETE",
      }),
    onSuccess: (result) =>
      queryClient.setQueryData(["wishlist", session?.user.id], result),
  });

  const items = wishlistQuery.data?.items ?? [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Wishlist</h1>
      {wishlistQuery.isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading your saved products...</p>
      ) : wishlistQuery.error instanceof Error ? (
        <p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {wishlistQuery.error.message}
        </p>
      ) : items.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Heart className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Your wishlist is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save products to find them here later.</p>
          <Button asChild className="mt-5"><Link to="/shop">Explore products</Link></Button>
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const product: Product = {
              id: item.product_id,
              category_id: item.category_id,
              sku: "",
              name: item.name,
              slug: item.slug,
              description: "",
              price: item.price,
              currency: item.currency,
              image_url: item.image_url,
              is_active: item.is_active,
              categories: item.category_name
                ? { id: item.category_id ?? "", name: item.category_name, slug: "" }
                : null,
              in_stock: item.in_stock,
            };
            return (
              <div key={item.id} className="relative">
                <ProductCard product={product} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 w-full"
                  disabled={removeItem.isPending}
                  onClick={() => removeItem.mutate(item.product_id)}
                >
                  <Trash2 size={14} /> Remove from wishlist
                </Button>
              </div>
            );
          })}
          {removeItem.error instanceof Error && (
            <p role="alert" className="sm:col-span-2 lg:col-span-4 text-sm text-red-700">
              {removeItem.error.message}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
