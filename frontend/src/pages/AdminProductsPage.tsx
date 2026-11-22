import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { formatPrice, type Category, type Product } from "@/modules/products/types";

const productFormSchema = z.object({
  sku: z.string().trim().min(1, "Enter a SKU.").max(64).regex(/^[A-Za-z0-9._-]+$/),
  name: z.string().trim().min(1, "Enter a product name.").max(160),
  description: z.string().trim().max(5000),
  categoryId: z.string(),
  price: z.coerce.number().finite().min(0),
  quantity: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});
type ProductFormInput = z.input<typeof productFormSchema>;
type ProductFormValues = z.output<typeof productFormSchema>;

const blankProduct: ProductFormValues = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  price: 0,
  quantity: 0,
  isActive: true,
};

function ProductField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        {...props}
        className="h-10 min-w-0 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>;
}

export function AdminProductsPage({ inventoryOnly = false }: { inventoryOnly?: boolean }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<string, File | undefined>>({});
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: blankProduct,
  });
  const resetForm = form.reset;

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiRequest<{ products: Product[] }>("/admin/products", token),
  });
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiRequest<{ categories: Category[] }>("/admin/categories", token),
    enabled: !inventoryOnly,
  });

  function updateCachedProduct(
    productId: string,
    changes: Partial<Product>,
  ) {
    queryClient.setQueryData<{ products: Product[] }>(["admin-products"], (current) =>
      current
        ? {
            products: current.products.map((product) =>
              product.id === productId ? { ...product, ...changes } : product,
            ),
          }
        : current,
    );
  }

  useEffect(() => {
    if (!editing) {
      resetForm(blankProduct);
      return;
    }
    resetForm({
      sku: editing.sku,
      name: editing.name,
      description: editing.description,
      categoryId: editing.category_id ?? "",
      price: Number(editing.price),
      quantity: editing.quantity ?? 0,
      isActive: editing.is_active,
    });
  }, [editing, resetForm]);

  const saveProduct = useMutation({
    mutationFn: (values: ProductFormValues) =>
      apiRequest<{ product: Product }>(
        editing ? `/admin/products/${editing.id}` : "/admin/products",
        token,
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({ ...values, categoryId: values.categoryId || null }),
        },
      ),
    onSuccess: ({ product }) => {
      setEditing(null);
      resetForm(blankProduct);
      setNotice("Product saved.");
      queryClient.setQueryData<{ products: Product[] }>(["admin-products"], (current) => {
        if (!current) return current;
        const exists = current.products.some((item) => item.id === product.id);
        return {
          products: exists
            ? current.products.map((item) =>
                item.id === product.id
                  ? { ...item, ...product, categories: item.categories }
                  : item,
              )
            : [product, ...current.products],
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const removeProduct = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/products/${id}`, token, { method: "DELETE" }),
    onSuccess: (_result, productId) => {
      updateCachedProduct(productId, { is_active: false });
      setNotice("Product removed from the shop.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
  const restoreProduct = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ product: Product }>(`/admin/products/${id}`, token, {
        method: "PUT",
        body: JSON.stringify({ isActive: true }),
      }),
    onSuccess: ({ product }) => {
      updateCachedProduct(product.id, { is_active: true });
      setNotice("Product restored to the shop.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateStock = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiRequest<{ inventory: { quantity: number } }>(`/admin/products/${id}/inventory`, token, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: (result, { id }) => {
      updateCachedProduct(id, { quantity: result.inventory.quantity });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });

  const permanentlyDeleteProduct = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ deleted: boolean; warning?: string }>(
        `/admin/products/${id}/permanent`,
        token,
        { method: "DELETE" },
      ),
    onSuccess: (result, productId) => {
      queryClient.setQueryData<{ products: Product[] }>(["admin-products"], (current) =>
        current
          ? { products: current.products.filter((product) => product.id !== productId) }
          : current,
      );
      setNotice(result.warning ?? "Product permanently deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const uploadImage = useMutation({
    mutationFn: async (product: Product) => {
      const file = imageFiles[product.id];
      if (!file) throw new Error("Choose an image first.");
      const formData = new FormData();
      formData.set("image", file);
      return apiRequest<{ imageUrl: string }>(
        `/admin/products/${product.id}/image`,
        token,
        { method: "POST", body: formData },
      );
    },
    onSuccess: ({ imageUrl }, product) => {
      setImageFiles({});
      updateCachedProduct(product.id, { image_url: imageUrl });
      setNotice("Product image updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const products = productsQuery.data?.products ?? [];
  const lowStockCount = products.filter(
    (product) => product.is_active && (product.quantity ?? 0) <= 5,
  ).length;
  const error = [
    productsQuery.error,
    categoriesQuery.error,
    saveProduct.error,
    removeProduct.error,
    restoreProduct.error,
    updateStock.error,
    permanentlyDeleteProduct.error,
    uploadImage.error,
  ].find((candidate): candidate is Error => candidate instanceof Error);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            {inventoryOnly ? "Staff portal · Inventory manager" : "Administration · Product management"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {inventoryOnly ? "Inventory workspace" : "Products & inventory"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inventoryOnly
              ? "Review the live catalogue and update stock quantities."
              : "Manage live catalogue records from Supabase."}
          </p>
        </div>
        {!inventoryOnly && (
          <Button
            variant="outline"
            onClick={() => document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Plus size={16} /> Add product
          </Button>
        )}
      </div>

      {error && <div className="mt-6"><ErrorNotice message={error.message} /></div>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {!inventoryOnly && <section id="product-form" className="mt-7 rounded-2xl border border-border bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{editing ? "Edit product" : "Add a product"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Changes are saved to the shared product catalogue.</p>
          </div>
          {editing && (
            <Button size="icon" variant="ghost" aria-label="Cancel editing" onClick={() => setEditing(null)}>
              <X size={18} />
            </Button>
          )}
        </div>
        <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={form.handleSubmit((values) => saveProduct.mutate(values))}>
          <ProductField label="Product name" {...form.register("name")} />
          <ProductField label="SKU" {...form.register("sku")} />
          <ProductField label="Price (INR)" type="number" min="0" step="0.01" {...form.register("price")} />
          <label className="grid gap-1.5 text-sm font-medium">
            Category
            <select className="h-10 rounded-xl border border-border bg-background px-3 font-normal" {...form.register("categoryId")}>
              <option value="">Uncategorized</option>
              {(categoriesQuery.data?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <ProductField label="Stock quantity" type="number" min="0" step="1" {...form.register("quantity")} />
          <label className="flex items-center gap-3 self-end rounded-xl bg-background px-3 py-2.5 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" {...form.register("isActive")} />
            Visible in shop
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2 lg:col-span-3">
            Description
            <textarea className="min-h-24 rounded-xl border border-border bg-background p-3 font-normal outline-none focus:border-primary" {...form.register("description")} />
          </label>
          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-3">
              Check the product name, SKU, price, and stock quantity.
            </p>
          )}
          {saveProduct.error instanceof Error && (
            <div className="sm:col-span-2 lg:col-span-3"><ErrorNotice message={saveProduct.error.message} /></div>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saveProduct.isPending}>
              {saveProduct.isPending ? "Saving..." : editing ? "Save changes" : "Create product"}
            </Button>
          </div>
        </form>
      </section>}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Catalogue</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{products.length} items</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              {lowStockCount} low stock
            </span>
          </div>
        </div>
        {productsQuery.isPending ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-muted-foreground">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <Search className="mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">Your catalogue is ready for its first product.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {products.map((product) => (
              <article key={product.id} className="grid gap-4 rounded-2xl border border-border bg-white p-4 sm:grid-cols-[80px_1fr_auto] sm:items-center">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-background">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="size-full object-cover" />
                  ) : (
                    <ImagePlus size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${product.is_active ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {product.is_active ? "Active" : "Hidden"}
                    </span>
                    {product.is_active && (product.quantity ?? 0) <= 5 && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                        Low stock
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {product.sku} · {product.categories?.name ?? "Uncategorized"} · {formatPrice(product.price, product.currency)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">
                      Stock
                      <input
                        key={`${product.id}-${product.quantity}`}
                        type="number"
                        min="0"
                        defaultValue={product.quantity ?? 0}
                        aria-label={`Stock quantity for ${product.name}`}
                        className="ml-2 h-8 w-20 rounded-lg border border-border px-2 text-sm text-foreground"
                        onBlur={(event) => {
                          const raw = event.currentTarget.value;
                          const quantity = Number(raw);
                          if (raw === "" || !Number.isInteger(quantity) || quantity < 0) {
                            setStockErrors((current) => ({
                              ...current,
                              [product.id]: "Enter a non-negative whole number.",
                            }));
                            return;
                          }
                          setStockErrors((current) => {
                            const next = { ...current };
                            delete next[product.id];
                            return next;
                          });
                          if (quantity !== product.quantity) {
                            updateStock.mutate({ id: product.id, quantity });
                          }
                        }}
                      />
                    </label>
                    {stockErrors[product.id] && (
                      <span role="alert" className="text-xs text-red-700">{stockErrors[product.id]}</span>
                    )}
                    {!inventoryOnly && (
                      <>
                        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 text-xs font-medium">
                          <ImagePlus size={14} /> Image
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) setImageFiles((current) => ({ ...current, [product.id]: file }));
                            }}
                          />
                        </label>
                        {imageFiles[product.id] && (
                          <Button size="sm" variant="outline" onClick={() => uploadImage.mutate(product)}>
                            Upload
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {!inventoryOnly && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditing(product)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    {product.is_active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={
                          removeProduct.isPending &&
                          removeProduct.variables === product.id
                        }
                        onClick={() => {
                          if (window.confirm(`Hide "${product.name}" from the shop?`)) {
                            setNotice(null);
                            removeProduct.mutate(product.id);
                          }
                        }}
                      >
                        Remove from shop
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={
                            restoreProduct.isPending &&
                            restoreProduct.variables === product.id
                          }
                          onClick={() => {
                            setNotice(null);
                            restoreProduct.mutate(product.id);
                          }}
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          disabled={
                            permanentlyDeleteProduct.isPending &&
                            permanentlyDeleteProduct.variables === product.id
                          }
                          onClick={() => {
                            if (window.confirm(
                              `Permanently delete "${product.name}"? This also removes its inventory, images, wishlist links, and stock history. Order history keeps its saved item details. Products still in customer carts cannot be deleted.`,
                            )) {
                              setNotice(null);
                              permanentlyDeleteProduct.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                          {permanentlyDeleteProduct.isPending &&
                          permanentlyDeleteProduct.variables === product.id
                            ? "Deleting..."
                            : "Delete permanently"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
