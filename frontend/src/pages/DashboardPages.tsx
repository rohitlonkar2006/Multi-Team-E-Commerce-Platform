import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Box,
  ClipboardList,
  Heart,
  PackageCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  total: number;
  created_at: string;
};

type AdminAnalytics = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
  lowStockProducts: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    currency: string;
    created_at: string;
  }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  weeklyOrders: Array<{ day: string; orders: number }>;
  salesByCategory: Array<{ category: string; revenue: number }>;
  topProducts: Array<{ product: string; quantity: number }>;
  paymentMethods: Array<{ method: string; count: number }>;
  orderStatuses: Array<{ status: string; count: number }>;
};

function formatPrice(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </p>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
    </article>
  );
}

function SectionHeading({ title, href, linkText }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {href && linkText && (
        <Link to={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkText}<ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function CustomerDashboardPage() {
  const { session, account } = useAuth();
  const ordersQuery = useQuery({
    queryKey: ["orders", session?.user.id],
    queryFn: () => apiRequest<{ orders: CustomerOrder[] }>("/orders", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const wishlistQuery = useQuery({
    queryKey: ["wishlist", session?.user.id],
    queryFn: () => apiRequest<{ items: unknown[] }>("/wishlist", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const orders = ordersQuery.data?.orders ?? [];
  const activeOrders = orders.filter(
    (order) => !["delivered", "cancelled", "payment_failed"].includes(order.status),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your ShopSphere</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hello{account?.profile?.full_name ? `, ${account.profile.full_name}` : ""}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">A quick look at your shopping activity.</p>
        </div>
        <Button asChild variant="outline"><Link to="/shop">Continue shopping</Link></Button>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-3" aria-label="Account overview">
        <MetricCard label="Total orders" value={ordersQuery.isPending ? "—" : String(orders.length)} caption="Orders placed with this account" icon={ShoppingBag} />
        <MetricCard label="In progress" value={ordersQuery.isPending ? "—" : String(activeOrders.length)} caption="Orders not yet completed" icon={Activity} />
        <MetricCard
          label="Saved items"
          value={wishlistQuery.isPending ? "—" : wishlistQuery.error ? "Unavailable" : String(wishlistQuery.data?.items.length ?? 0)}
          caption="Products in your wishlist"
          icon={Heart}
        />
      </section>
      {wishlistQuery.error instanceof Error && (
        <div className="mt-4"><ErrorNotice message={wishlistQuery.error.message} /></div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <SectionHeading title="Recent orders" href="/orders" linkText="View all orders" />
          {ordersQuery.isPending ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading your orders...</p>
          ) : ordersQuery.error instanceof Error ? (
            <div className="mt-5"><ErrorNotice message={ordersQuery.error.message} /></div>
          ) : orders.length ? (
            <div className="mt-4 divide-y divide-border">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-1 last:pb-1 hover:bg-background/70"
                >
                  <span>
                    <span className="block text-sm font-semibold">{order.order_number}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatDate(order.created_at)} · {order.status.replaceAll("_", " ")}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{formatPrice(order.total, order.currency)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-background p-5 text-center">
              <ShoppingBag className="mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">No orders yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Your orders will appear here after checkout.</p>
              <Button asChild size="sm" className="mt-4"><Link to="/shop">Explore the shop</Link></Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <SectionHeading title="Account shortcuts" />
          <div className="mt-4 grid gap-2">
            {[
              { to: "/account", label: "Profile & addresses", icon: UserRound },
              { to: "/wishlist", label: "My wishlist", icon: Heart },
              { to: "/cart", label: "Shopping cart", icon: ShoppingBag },
              { to: "/orders", label: "Order history", icon: ClipboardList },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-medium transition hover:border-primary/40 hover:bg-background">
                <Icon size={17} className="text-primary" aria-hidden="true" />
                {label}
                <ArrowUpRight className="ml-auto text-muted-foreground" size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {ordersQuery.error instanceof Error && <p className="mt-4 text-xs text-muted-foreground">Your order summary is temporarily unavailable.</p>}
        </section>
      </div>
    </main>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

export function AdminDashboardPage() {
  const { session } = useAuth();
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () =>
      apiRequest<{ analytics: AdminAnalytics }>("/admin/analytics", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const data = analyticsQuery.data?.analytics;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Administration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Store overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">Live totals and trends from your ShopSphere database.</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Administration">
          <Button asChild variant="outline" size="sm"><Link to="/admin/products"><Box size={15} className="mr-2" />Products</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/categories">Categories</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/deliveries"><PackageCheck size={15} className="mr-2" />Delivery</Link></Button>
        </nav>
      </div>

      {analyticsQuery.isPending ? (
        <p className="mt-8 rounded-xl bg-white p-5 text-sm text-muted-foreground" aria-live="polite">
          Loading store analytics...
        </p>
      ) : analyticsQuery.error instanceof Error ? (
        <div className="mt-8"><ErrorNotice message={analyticsQuery.error.message} /></div>
      ) : data ? (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Store metrics">
            <MetricCard label="Successful revenue" value={formatPrice(data.totalRevenue)} caption="Successful simulated payment captures" icon={Activity} />
            <MetricCard label="Orders" value={data.totalOrders.toLocaleString("en-IN")} caption={`${data.pendingOrders} currently pending`} icon={ShoppingBag} />
            <MetricCard label="Customers" value={data.totalCustomers.toLocaleString("en-IN")} caption="Accounts assigned the customer role" icon={UserRound} />
            <MetricCard label="Active products" value={data.totalProducts.toLocaleString("en-IN")} caption={`${data.lowStockProducts} products at 5 or fewer units`} icon={Box} />
            <MetricCard label="Completed orders" value={data.completedOrders.toLocaleString("en-IN")} caption="Orders marked delivered" icon={PackageCheck} />
            <MetricCard label="Low stock" value={data.lowStockProducts.toLocaleString("en-IN")} caption="Products with five units or fewer" icon={Box} />
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-2" aria-label="Store charts">
            <ChartPanel title="Revenue · last 6 months">
              {data.monthlyRevenue.some((row) => row.revenue > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyRevenue} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={64} />
                    <Tooltip formatter={(value) => formatPrice(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#0f766e" fill="url(#revenueFill)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="grid h-full place-items-center text-sm text-muted-foreground">Revenue will appear after successful payments.</p>}
            </ChartPanel>
            <ChartPanel title="Orders · last 7 days">
              {data.weeklyOrders.some((row) => row.orders > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyOrders} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#d97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="grid h-full place-items-center text-sm text-muted-foreground">Orders from this week will appear here.</p>}
            </ChartPanel>
            <ChartPanel title="Revenue by category">
              {data.salesByCategory.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.salesByCategory} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="category" width={100} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip formatter={(value) => formatPrice(Number(value))} />
                    <Bar dataKey="revenue" fill="#0f766e" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="grid h-full place-items-center text-sm text-muted-foreground">Category sales will appear after orders.</p>}
            </ChartPanel>
            <ChartPanel title="Best-selling products">
              {data.topProducts.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topProducts} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="product" width={120} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#d97706" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="grid h-full place-items-center text-sm text-muted-foreground">Product sales will appear after orders.</p>}
            </ChartPanel>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <SectionHeading title="Latest orders" />
            {data.recentOrders.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                    <tr><th className="py-3 pr-4 font-medium">Order</th><th className="py-3 pr-4 font-medium">Date</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 text-right font-medium">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-3 pr-4 font-medium">{order.order_number}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDate(order.created_at)}</td>
                        <td className="py-3 pr-4 capitalize">{order.status.replaceAll("_", " ")}</td>
                        <td className="py-3 text-right font-medium">{formatPrice(order.total, order.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-background p-5 text-center text-sm text-muted-foreground">
                <PackageCheck className="mx-auto mb-2" aria-hidden="true" />
                No orders have been placed yet.
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export function StaffWorkspacePage() {
  const { pathname } = useLocation();
  const workspace =
    pathname.endsWith("/inventory")
      ? { title: "Inventory workspace", role: "Inventory manager", description: "Inventory controls are restricted to accounts assigned the inventory manager role." }
      : pathname.endsWith("/orders")
        ? { title: "Order workspace", role: "Order manager", description: "Order operations are restricted to accounts assigned the order manager role." }
        : { title: "Delivery workspace", role: "Delivery operations", description: "Delivery operations are restricted to assigned delivery staff and delivery managers." };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Staff portal · {workspace.role}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{workspace.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{workspace.description}</p>
      <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <h2 className="font-semibold">Workspace not enabled yet</h2>
        <p className="mt-1">
          Your role is checked before this page is shown, but its operational data and actions are not
          connected yet. No inventory, customer order, or delivery information is displayed here.
        </p>
      </section>
      <Button asChild variant="outline" className="mt-5"><Link to="/">Return to storefront</Link></Button>
    </main>
  );
}
