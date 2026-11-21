import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Minus, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { apiRequest } from "@/lib/api";
import { formatPrice, type Category, type ProductListResponse } from "@/modules/products/types";

function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      {message}
    </div>
  );
}

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  function setSearch(value: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set("q", value);
    else nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
  }
  function setCategoryId(value: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set("categoryId", value);
    else nextParams.delete("categoryId");
    setSearchParams(nextParams, { replace: true });
  }
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiRequest<{ categories: Category[] }>("/categories"),
  });
  const productsQuery = useQuery({
    queryKey: ["products", debouncedSearch, categoryId, minPrice, maxPrice, sort, page],
    queryFn: () => {
      const params = new URLSearchParams({ sort, page: String(page), pageSize: "12" });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (categoryId) params.set("categoryId", categoryId);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      return apiRequest<ProductListResponse>(`/products?${params.toString()}`);
    },
  });

  const products = productsQuery.data?.products ?? [];
  const pageCount = Math.max(
    1,
    Math.ceil((productsQuery.data?.total ?? 0) / (productsQuery.data?.pageSize ?? 12)),
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">The collection</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Shop thoughtfully.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Browse products from the live catalogue.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {productsQuery.data ? `${productsQuery.data.total} products` : " "}
        </p>
      </div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,200px)_repeat(2,minmax(0,160px))_minmax(0,180px)]">
        <label className="flex h-11 min-w-0 items-center gap-3 rounded-xl bg-background px-3">
          <Search size={17} className="text-muted-foreground" />
          <span className="sr-only">Search products</span>
          <input
            id="catalog-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search products..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl bg-background px-3">
          <SlidersHorizontal size={16} className="text-muted-foreground" />
          <span className="sr-only">Filter by category</span>
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          >
            <option value="">All categories</option>
            {(categoriesQuery.data?.categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl bg-background px-3 text-xs text-muted-foreground">
          Min price
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => {
              setMinPrice(event.target.value);
              setPage(1);
            }}
            className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none"
          />
        </label>
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl bg-background px-3 text-xs text-muted-foreground">
          Max price
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => {
              setMaxPrice(event.target.value);
              setPage(1);
            }}
            className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none"
          />
        </label>
        <label className="flex h-11 min-w-0 items-center rounded-xl bg-background px-3">
          <span className="sr-only">Sort products</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          >
            <option value="newest">Recently added</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
        </label>
      </div>

      {categoriesQuery.error instanceof Error && (
        <div className="mt-5"><ErrorState message={categoriesQuery.error.message} /></div>
      )}
      {productsQuery.error instanceof Error ? (
        <div className="mt-8"><ErrorState message={productsQuery.error.message} /></div>
      ) : productsQuery.isPending ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading products">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-border bg-white p-3">
              <div className="aspect-[4/3] rounded-xl bg-muted" />
              <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
              <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">No products found</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or category.</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              setSearch("");
              setCategoryId("");
              setMinPrice("");
              setMaxPrice("");
              setSearchParams({});
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
          <Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      )}
    </main>
  );
}

export function ProductDetailsPage() {
  const { slug = "" } = useParams();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantityState, setQuantityState] = useState({ slug: "", value: 1 });
  const quantity = quantityState.slug === slug ? quantityState.value : 1;
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [selectedImage, setSelectedImage] = useState<{ slug: string; url: string } | null>(null);
  const addToCart = useMutation({
    mutationFn: ({ productId }: { productId: string; goToCart: boolean }) =>
      apiRequest("/cart/items", session?.access_token, {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      }),
    onSuccess: async (_data, action) => {
      await queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] });
      if (action.goToCart) navigate("/cart");
    },
  });
  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: () => apiRequest<{ product: import("@/modules/products/types").Product }>(`/products/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });

  if (productQuery.isPending) {
    return <main className="mx-auto max-w-7xl px-6 py-16 text-sm text-muted-foreground">Loading product...</main>;
  }
  if (productQuery.error instanceof Error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <ErrorState message={productQuery.error.message} />
      </main>
    );
  }

  const product = productQuery.data?.product;
  if (!product) return null;
  const images = product.images ?? [];
  const primaryImage = images.find((image) => image.is_primary)?.image_url ?? product.image_url;
  const displayedImage = selectedImage?.slug === slug ? selectedImage.url : primaryImage;
  const availableGalleryImages = images.filter((image) => !failedImages.has(image.image_url));
  function requireSignIn() {
    navigate("/login", { state: { from: location.pathname } });
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-2 lg:px-10 lg:py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="grid min-h-[22rem] place-items-center p-4 sm:min-h-[30rem]">
        {displayedImage && !failedImages.has(displayedImage) ? (
          <img
            src={displayedImage}
            alt={images.find((image) => image.image_url === displayedImage)?.alt_text || product.name}
            onError={() => setFailedImages((current) => new Set(current).add(displayedImage))}
            className="max-h-[34rem] w-full object-contain"
          />
        ) : (
          <div
            className="grid justify-items-center gap-2 text-center text-muted-foreground"
            role="img"
            aria-label={`${product.name} image unavailable`}
          >
            <ImageOff size={32} strokeWidth={1.5} />
            <p className="text-sm">Product image unavailable</p>
          </div>
        )}
        </div>
        {availableGalleryImages.length > 1 && (
          <div className="flex w-full gap-2 overflow-x-auto border-t border-border p-3">
            {availableGalleryImages.map((image) => (
              <button
                key={image.id}
                type="button"
                aria-label={`View ${image.alt_text || product.name}`}
                aria-pressed={displayedImage === image.image_url}
                onClick={() => setSelectedImage({ slug, url: image.image_url })}
                className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 ${displayedImage === image.image_url ? "border-primary" : "border-transparent"}`}
              >
                <img
                  src={image.image_url}
                  alt=""
                  className="size-full object-cover"
                  onError={() => setFailedImages((current) => new Set(current).add(image.image_url))}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <section className="py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          {product.categories?.name ?? "ShopSphere collection"}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-4 text-2xl font-medium">{formatPrice(product.price, product.currency)}</p>
        <p className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">
          {product.description || "A considered addition to your everyday essentials."}
        </p>
        <p className={`mt-5 text-sm font-medium ${product.in_stock ? "text-primary" : "text-muted-foreground"}`}>
          {product.in_stock ? "In stock" : "Currently unavailable"}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span className="text-sm font-medium">Quantity</span>
          <div className="inline-flex items-center gap-1 rounded-xl border border-border p-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Decrease quantity"
              disabled={quantity <= 1 || addToCart.isPending}
              onClick={() => setQuantityState({ slug, value: Math.max(1, quantity - 1) })}
            >
              <Minus size={15} />
            </Button>
            <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Increase quantity"
              disabled={quantity >= 99 || addToCart.isPending}
              onClick={() => setQuantityState({ slug, value: Math.min(99, quantity + 1) })}
            >
              <Plus size={15} />
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            disabled={!product.in_stock || addToCart.isPending}
            onClick={() => {
              if (!session) {
                requireSignIn();
                return;
              }
              addToCart.mutate({ productId: product.id, goToCart: false });
            }}
          >
            {addToCart.isPending ? "Adding..." : session ? "Add to cart" : "Sign in to add"}
          </Button>
          <Button
            variant="outline"
            disabled={!product.in_stock || addToCart.isPending}
            onClick={() => {
              if (!session) {
                requireSignIn();
                return;
              }
              addToCart.mutate({ productId: product.id, goToCart: true });
            }}
          >
            Buy now
          </Button>
        </div>
        {addToCart.isSuccess && (
          <p className="mt-3 text-sm text-primary" role="status">
            Added to your cart. <Link className="underline" to="/cart">View cart</Link>
          </p>
        )}
        {addToCart.error instanceof Error && (
          <p className="mt-3 text-sm text-red-700" role="alert">{addToCart.error.message}</p>
        )}
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          Checkout uses a clearly labelled payment simulation. No real payment details are collected.
        </p>
      </section>
    </main>
  );
}
