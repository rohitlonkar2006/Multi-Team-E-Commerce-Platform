import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import type { Category } from "@/modules/products/types";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500),
  imageUrl: z.union([
    z.literal(""),
    z.string().trim().url("Enter a valid image URL"),
  ]).optional(),
});
type CategoryValues = z.infer<typeof categorySchema>;

export function AdminCategoriesPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const client = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", description: "", imageUrl: "" },
  });
  const resetForm = form.reset;
  useEffect(() => {
    resetForm(
      editing
        ? { name: editing.name, slug: editing.slug, description: editing.description, imageUrl: editing.image_url ?? "" }
        : { name: "", slug: "", description: "", imageUrl: "" },
    );
  }, [editing, resetForm]);

  const query = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiRequest<{ categories: Category[] }>("/admin/categories", token),
  });
  const save = useMutation({
    mutationFn: (values: CategoryValues) =>
      apiRequest(
        editing ? `/admin/categories/${editing.id}` : "/admin/categories",
        token,
        {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(values),
        },
      ),
    onSuccess: async () => {
      setEditing(null);
      form.reset();
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
      await client.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  const hide = useMutation({
    mutationFn: (category: Category) =>
      apiRequest(`/admin/categories/${category.id}`, token, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
      await client.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  const restore = useMutation({
    mutationFn: (category: Category) =>
      apiRequest(`/admin/categories/${category.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ isActive: true }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
      await client.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  const categories = query.data?.categories ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Team 2 · Product Management</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Categories</h1>
      <div className="mt-7 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form className="h-fit rounded-2xl border border-border bg-white p-6" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editing ? "Edit category" : "Add a category"}</h2>
            {editing && <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>}
          </div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <input className="h-10 rounded-xl border border-border bg-background px-3 font-normal" {...form.register("name")} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              URL slug
              <input className="h-10 rounded-xl border border-border bg-background px-3 font-normal" placeholder="home-living" {...form.register("slug")} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Description
              <textarea className="min-h-20 rounded-xl border border-border bg-background p-3 font-normal" {...form.register("description")} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Image URL
              <input
                type="url"
                className="h-10 rounded-xl border border-border bg-background px-3 font-normal"
                placeholder="https://images.example.com/category.jpg"
                {...form.register("imageUrl")}
              />
            </label>
            {Object.keys(form.formState.errors).length > 0 && (
              <p className="text-sm text-red-700">Check the category name and lowercase URL slug.</p>
            )}
            {save.error instanceof Error && <p role="alert" className="text-sm text-red-700">{save.error.message}</p>}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : editing ? "Save category" : "Create category"}
            </Button>
          </div>
        </form>

        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold">All categories</h2>
          {hide.error instanceof Error && (
            <p role="alert" className="mt-4 text-sm text-red-700">{hide.error.message}</p>
          )}
          {restore.error instanceof Error && (
            <p role="alert" className="mt-4 text-sm text-red-700">{restore.error.message}</p>
          )}
          {query.isPending ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading categories...</p>
          ) : query.error instanceof Error ? (
            <p role="alert" className="mt-4 text-sm text-red-700">{query.error.message}</p>
          ) : categories.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt=""
                        className="size-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="size-14 shrink-0 rounded-xl bg-secondary" />
                    )}
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        /{category.slug} · {category.is_active ? "Active" : "Hidden"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(category)}>Edit</Button>
                    {category.is_active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={hide.isPending}
                        onClick={() => {
                          if (window.confirm(`Hide category "${category.name}"?`)) hide.mutate(category);
                        }}
                      >
                        Hide
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={restore.isPending}
                        onClick={() => restore.mutate(category)}
                      >
                        Show
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
