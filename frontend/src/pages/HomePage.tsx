import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Circle,
  Headphones,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Boxes,
  CreditCard,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import type { Category, Product, ProductListResponse } from "@/modules/products/types";

type HealthResponse = {
  status: string;
  service: string;
  supabaseConfigured: boolean;
};

const heroImage =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1500&q=85";

const categoryImageBySlug: Record<string, string> = {
  "home-living":
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  technology:
    "https://images.pexels.com/photos/7974/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=900",
  fashion:
    "https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&cs=tinysrgb&w=900",
};

function getApiHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

function CategoryTile({
  category,
  imageUrl,
}: {
  category: Category;
  imageUrl?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const source = category.image_url || imageUrl || categoryImageBySlug[category.slug];

  return (
    <Link
      to={`/shop?categoryId=${encodeURIComponent(category.id)}`}
      className="group relative isolate min-h-64 overflow-hidden rounded-3xl bg-secondary"
    >
      {source && !imageFailed ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 -z-10 size-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary via-background to-primary/20" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="flex h-full min-h-64 flex-col justify-end p-5 text-white sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/75">
          Explore the collection
        </p>
        <h3 className="mt-2 text-xl font-semibold">{category.name}</h3>
        <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium">
          Shop category <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}

const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  consent: z.boolean().refine((value) => value, {
    message: "Please confirm you want to receive updates.",
  }),
});
type NewsletterValues = z.infer<typeof newsletterSchema>;

export function HomePage() {
  const health = useQuery({
    queryKey: ["api-health"],
    queryFn: getApiHealth,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiRequest<{ categories: Category[] }>("/categories"),
  });
  const featuredQuery = useQuery({
    queryKey: ["products", "home-featured"],
    queryFn: () =>
      apiRequest<ProductListResponse>("/products?sort=newest&page=1&pageSize=4"),
  });
  const trendingQuery = useQuery({
    queryKey: ["products", "trending"],
    queryFn: () => apiRequest<{ products: Product[] }>("/products/trending"),
  });
  const newsletterForm = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "", consent: false },
  });
  const subscribe = useMutation({
    mutationFn: (values: NewsletterValues) =>
      apiRequest<{ subscribed: boolean }>("/newsletter", undefined, {
        method: "POST",
        body: JSON.stringify({ email: values.email }),
      }),
    onSuccess: (result) => {
      if (result.subscribed) newsletterForm.reset();
    },
  });

  const featuredProducts = featuredQuery.data?.products ?? [];
  const productsByCategory = new Map<string, Product>();
  for (const product of featuredProducts) {
    if (product.category_id && !productsByCategory.has(product.category_id)) {
      productsByCategory.set(product.category_id, product);
    }
  }
  const apiOnline = health.data?.status === "ok";
  const supabaseConfigured = health.data?.supabaseConfigured === true;

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-9 sm:pt-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-16">
          <div className="reveal-on-load relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="size-2 rounded-full bg-primary" />
              A considered collection for everyday
            </p>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Good things,
              <br />
              <span className="font-serif font-normal italic text-primary">
                all in one place.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Discover useful pieces for your home, work, and everyday. Browse
              the live ShopSphere catalogue and find your next favorite.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/shop">Explore collection <ArrowRight size={17} /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/shop">Shop now</Link>
              </Button>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border pt-5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-primary" /> Verified accounts</span>
              <span className="inline-flex items-center gap-2"><PackageCheck size={16} className="text-primary" /> Live stock checks</span>
            </div>
          </div>
          <div className="reveal-on-load relative min-h-[340px] overflow-hidden rounded-[2rem] bg-secondary sm:min-h-[480px]">
            <img
              src={heroImage}
              alt="Warm, modern living room with thoughtful home details"
              onError={(event) => {
                event.currentTarget.src =
                  "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200";
              }}
              className="absolute inset-0 size-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-5 rounded-2xl border border-white/30 bg-white/85 p-4 backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  ShopSphere edit
                </p>
                <p className="mt-1 text-sm font-medium text-foreground sm:text-base">
                  Thoughtful picks, ready to explore.
                </p>
              </div>
              <Link
                to="/shop"
                aria-label="Explore the ShopSphere collection"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-105"
              >
                <ArrowDownRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="scroll-mt-24 bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <SectionHeading
            eyebrow="Browse by interest"
            title="Shop by category"
            description="Explore the categories currently available in the live catalogue."
            action={<Button asChild variant="ghost"><Link to="/shop">View all products <ArrowRight size={16} /></Link></Button>}
          />
          {categoriesQuery.isPending ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="min-h-64 animate-pulse rounded-3xl bg-muted" />
              ))}
            </div>
          ) : categoriesQuery.error instanceof Error ? (
            <p role="alert" className="mt-7 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {categoriesQuery.error.message}
            </p>
          ) : categoriesQuery.data?.categories.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoriesQuery.data.categories.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  imageUrl={productsByCategory.get(category.id)?.image_url ?? undefined}
                />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No active categories are available yet.
            </div>
          )}
        </div>
      </section>

      <section id="featured" className="scroll-mt-24 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <SectionHeading
            eyebrow="From the live catalogue"
            title="Recently added"
            description="The latest products from the ShopSphere catalogue."
            action={<Button asChild variant="ghost"><Link to="/shop">Browse the shop <ArrowRight size={16} /></Link></Button>}
          />
          {featuredQuery.isPending ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : featuredQuery.error instanceof Error ? (
            <p role="alert" className="mt-7 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {featuredQuery.error.message}
            </p>
          ) : featuredProducts.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              Products will appear here when the catalogue is populated.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <SectionHeading
            eyebrow="Chosen by customers"
            title="Trending products"
            description="Ranked from actual order history. No purchase activity is fabricated."
            action={<Button asChild variant="ghost"><Link to="/shop">Explore all <ArrowRight size={16} /></Link></Button>}
          />
          {trendingQuery.isPending ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : trendingQuery.error instanceof Error ? (
            <p className="mt-7 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              Purchase-based rankings are unavailable until the order schema is installed.
            </p>
          ) : trendingQuery.data?.products.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trendingQuery.data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
              No purchase trends yet. Products will be ranked after real orders are placed.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 sm:py-18">
        <div className="relative grid overflow-hidden rounded-[2rem] bg-primary text-primary-foreground md:grid-cols-[1fr_0.85fr]">
          <div className="relative z-10 p-7 sm:p-10 lg:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">A new point of view</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Find a little more of what makes a space yours.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
              Explore home, technology, and fashion from the current ShopSphere catalogue.
              No unconfigured discounts or limited-time offers.
            </p>
            <Button asChild variant="secondary" className="mt-7">
              <Link to="/shop">Shop the collection <ArrowRight size={16} /></Link>
            </Button>
          </div>
          <div className="relative min-h-56 md:min-h-full">
            <img
              src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Comfortable living space with natural light"
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-transparent md:from-primary/30" />
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <SectionHeading
            eyebrow="Why ShopSphere"
            title="A thoughtful way to shop online"
            description="Built around real catalogue and account workflows, with payments clearly labelled as a simulation."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Benefit icon={<ShieldCheck />} title="Account security" text="Supabase Auth and role checks protect customer and staff routes." />
            <Benefit icon={<PackageCheck />} title="Live product details" text="Catalogue prices and availability come from the connected database." />
            <Benefit icon={<CreditCard />} title="Clear payment status" text="Checkout uses labelled academic payment simulations only." />
            <Benefit icon={<Headphones />} title="Project support" text="Use the project team or course channel for support; no helpdesk is configured." />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <SectionHeading
            eyebrow="Simple by design"
            title="How it works"
            description="A clear path from product discovery to order history."
          />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Discover products", "Browse categories and search the live catalogue.", <ShoppingBag key="icon" />],
              ["02", "Add to cart", "Save products and adjust quantities before checkout.", <Boxes key="icon" />],
              ["03", "Complete checkout", "Choose an address and a clearly labelled payment method.", <CreditCard key="icon" />],
              ["04", "Follow your order", "Review order and payment status in your account.", <Truck key="icon" />],
            ].map(([number, title, description, icon]) => (
              <article key={number as string} className="border-t border-border pt-5">
                <div className="flex items-center justify-between text-primary">
                  <span className="text-xs font-semibold tracking-[0.14em]">{number}</span>
                  {icon}
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eef2ed] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <SectionHeading
            eyebrow="Designed for collaboration"
            title="One platform, four connected teams"
            description="Independent modules share clear database boundaries and API contracts."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TeamCard number="01" icon={<UserRound />} title="User Management" text="Identity, accounts, profiles, and access control." />
            <TeamCard number="02" icon={<PackageCheck />} title="Product Management" text="Product catalogue, categories, images, and inventory." />
            <TeamCard number="03" icon={<ShoppingBag />} title="Cart & Payment" text="Persistent cart and a clearly labelled checkout simulation." />
            <TeamCard number="04" icon={<Truck />} title="Orders & Delivery" text="Order records and delivery workflows as the platform grows." />
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 bg-white py-14 sm:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Stay in the loop</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">ShopSphere notes</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Subscribe for project updates. Your email is saved only after you confirm consent.
              No marketing email provider is configured, so this demo stores the subscription but sends no email.
            </p>
          </div>
          <form
            className="rounded-3xl border border-border bg-background p-5 sm:p-7"
            onSubmit={newsletterForm.handleSubmit((values) => subscribe.mutate(values))}
          >
            {subscribe.data?.subscribed ? (
              <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
                Your subscription is saved.
              </p>
            ) : (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-11 rounded-xl border border-border bg-white px-3 font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    {...newsletterForm.register("email")}
                  />
                </label>
                {newsletterForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-700">{newsletterForm.formState.errors.email.message}</p>
                )}
                <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <input type="checkbox" className="mt-1 accent-primary" {...newsletterForm.register("consent")} />
                  <span>I agree to save my email for ShopSphere project updates.</span>
                </label>
                {newsletterForm.formState.errors.consent && (
                  <p className="mt-1 text-xs text-red-700">{newsletterForm.formState.errors.consent.message}</p>
                )}
                {subscribe.error instanceof Error && (
                  <p role="alert" className="mt-3 text-sm text-red-700">{subscribe.error.message}</p>
                )}
                <Button type="submit" className="mt-4" disabled={subscribe.isPending}>
                  {subscribe.isPending ? "Saving..." : "Subscribe"}
                </Button>
              </>
            )}
          </form>
        </div>
      </section>

      <section className="border-t border-border/80 bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span>Platform status</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <StatusInline label="API" ready={apiOnline} loading={health.isPending} />
            <StatusInline
              label="Supabase configuration"
              ready={supabaseConfigured}
              loading={health.isPending}
              detail={supabaseConfigured ? "Configured" : "Not configured"}
            />
            {health.error instanceof Error && (
              <button type="button" className="underline" onClick={() => void health.refetch()}>
                Retry status check
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">{icon}</span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}

function TeamCard({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="group rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between text-primary">
        <span className="text-xs font-semibold tracking-[0.15em]">{number}</span>
        {icon}
      </div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}

function StatusInline({
  label,
  ready,
  loading,
  detail,
}: {
  label: string;
  ready: boolean;
  loading: boolean;
  detail?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {ready ? <Check size={14} className="text-primary" /> : <Circle size={13} className={loading ? "animate-pulse" : ""} />}
      {label}: {detail ?? (loading ? "Checking" : ready ? "Available" : "Unavailable")}
    </span>
  );
}
