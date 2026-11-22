import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type CartItem = {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number;
  currency: string;
  quantity: number;
  available_stock: number;
};

type CartData = {
  items: CartItem[];
  subtotal: number;
};

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  total: number;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    amount: number;
    transaction_reference: string | null;
    created_at: string;
  }>;
};

type CheckoutResult = {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_id: string;
  payment_status: string;
  duplicate: boolean;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function PageError({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>;
}

export function CartPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const checkoutKey = useRef<string | null>(null);
  const token = session?.access_token;
  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "simulated_upi" | "simulated_card" | "cash_on_delivery"
  >("simulated_upi");
  const [simulatedResult, setSimulatedResult] = useState<"success" | "failed">("success");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    queryFn: () => apiRequest<{ cart: CartData }>("/cart", token),
    enabled: Boolean(token),
  });
  const addressesQuery = useQuery({
    queryKey: ["addresses", session?.user.id],
    queryFn: () => apiRequest<{ addresses: Address[] }>("/users/addresses", token),
    enabled: Boolean(token),
  });

  const cartMutation = useMutation({
    mutationFn: ({
      itemId,
      quantity,
      remove,
    }: {
      itemId: string;
      quantity?: number;
      remove?: boolean;
    }) =>
      apiRequest<{ cart: CartData }>(
        `/cart/items/${itemId}`,
        token,
        remove
          ? { method: "DELETE" }
          : { method: "PATCH", body: JSON.stringify({ quantity }) },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(["cart", session?.user.id], result);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ checkout: CheckoutResult }>("/orders", token, {
        method: "POST",
        body: JSON.stringify({
          addressId,
          paymentMethod,
          simulatedResult: paymentMethod === "cash_on_delivery" ? "success" : simulatedResult,
            idempotencyKey: (checkoutKey.current ??= crypto.randomUUID()),
        }),
      }),
    onSuccess: async ({ checkout }) => {
        checkoutKey.current = null;
      setCheckoutResult(checkout);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ["orders", session?.user.id] }),
      ]);
    },
  });

  const cart = cartQuery.data?.cart;
  const addresses = addressesQuery.data?.addresses ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your bag</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Cart & checkout</h1>

      {checkoutResult && (
        <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5" aria-live="polite">
          <h2 className="font-semibold">
            {checkoutResult.payment_status === "failed"
              ? "Simulated payment failed"
              : checkoutResult.payment_status === "pending"
                ? "Order placed — payment due on delivery"
                : "Order confirmed"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {checkoutResult.order_number} · Payment: {checkoutResult.payment_status}
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to={`/orders/${checkoutResult.order_id}`}>View order</Link>
          </Button>
        </section>
      )}

      {cartQuery.isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading your cart...</p>
      ) : cartQuery.error instanceof Error ? (
        <div className="mt-8"><PageError message={cartQuery.error.message} /></div>
      ) : !cart?.items.length ? (
        <section className="mt-8 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <ShoppingBag className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Browse the collection and add something you love.</p>
          <Button asChild className="mt-5"><Link to="/shop">Browse products</Link></Button>
        </section>
      ) : (
        <div className="mt-6 grid items-start gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
          <section className="grid gap-3">
            {cart.items.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-2xl border border-border bg-white p-3 sm:gap-4 sm:p-4">
                <Link to={`/products/${item.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-background sm:size-24">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-xs text-muted-foreground">No image</span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${item.slug}`} className="font-medium hover:text-primary">{item.name}</Link>
                  <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.price, item.currency)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.available_stock > 0 ? `${item.available_stock} available` : "Out of stock"}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 sm:gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Decrease ${item.name} quantity`}
                      disabled={item.quantity <= 1 || cartMutation.isPending}
                      onClick={() => cartMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-7 text-center text-sm" aria-label="Quantity">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Increase ${item.name} quantity`}
                      disabled={item.quantity >= Math.min(99, item.available_stock) || cartMutation.isPending}
                      onClick={() => cartMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                    >
                      <Plus size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto px-2 sm:px-4"
                      aria-label={`Remove ${item.name}`}
                      disabled={cartMutation.isPending}
                      onClick={() => cartMutation.mutate({ itemId: item.id, remove: true })}
                    >
                      <Trash2 size={15} /> Remove
                    </Button>
                  </div>
                </div>
                <p className="hidden shrink-0 text-sm font-semibold sm:block">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </p>
              </article>
            ))}
            {cartMutation.error instanceof Error && <PageError message={cartMutation.error.message} />}
          </section>

          <section className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Checkout</p>
              <h2 className="mt-1 text-lg font-semibold">Complete your order</h2>
            </div>

            <div className="grid gap-5 p-5">
            <div>
              <h3 className="font-semibold">Delivery address</h3>
              {addressesQuery.isPending ? (
                <p className="mt-2 text-sm text-muted-foreground">Loading addresses...</p>
              ) : addressesQuery.error instanceof Error ? (
                <div className="mt-3"><PageError message={addressesQuery.error.message} /></div>
              ) : addresses.length ? (
                <label className="mt-3 grid gap-1.5 text-sm">
                  <span className="sr-only">Select delivery address</span>
                  <select
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    value={addressId}
                    onChange={(event) => setAddressId(event.target.value)}
                  >
                    <option value="">Choose an address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label} — {address.address_line_1}, {address.city}
                        {address.is_default ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">Add an address before checkout.</p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link to="/account">Manage addresses</Link>
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold">Payment</h3>
              <label className="mt-3 grid gap-1.5 text-sm">
                <span>Method</span>
                <select
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as typeof paymentMethod)
                  }
                >
                  <option value="simulated_upi">Simulated UPI</option>
                  <option value="simulated_card">Simulated card</option>
                  <option value="cash_on_delivery">Cash on delivery</option>
                </select>
              </label>
              {paymentMethod !== "cash_on_delivery" && (
                <fieldset className="mt-3">
                  <legend className="text-sm">Simulated payment outcome</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["success", "failed"] as const).map((outcome) => (
                      <Button
                        key={outcome}
                        type="button"
                        size="sm"
                        className="px-2"
                        variant={simulatedResult === outcome ? "default" : "outline"}
                        aria-pressed={simulatedResult === outcome}
                        onClick={() => setSimulatedResult(outcome)}
                      >
                        Simulate {outcome}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Academic simulation only. No real card, UPI, or banking details are collected.
                  </p>
                </fieldset>
              )}
            </div>

            <div className="rounded-xl bg-secondary/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-lg font-semibold">{formatPrice(cart.subtotal, cart.items[0]?.currency ?? "INR")}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Tax and shipping are currently zero.
              </p>
              <Button
                className="mt-4 min-h-11 w-full"
                disabled={
                  checkoutMutation.isPending ||
                  !addressId ||
                  !cart.items.length ||
                  cart.items.some((item) => item.quantity > item.available_stock)
                }
                onClick={() => checkoutMutation.mutate()}
              >
                {checkoutMutation.isPending ? "Placing order..." : "Place order"}
              </Button>
              {checkoutMutation.error instanceof Error && (
                <div className="mt-3"><PageError message={checkoutMutation.error.message} /></div>
              )}
            </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export function OrdersPage() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ["orders", session?.user.id],
    queryFn: () => apiRequest<{ orders: Order[] }>("/orders", session?.access_token),
    enabled: Boolean(session?.access_token),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Order history</h1>
      {query.isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading orders...</p>
      ) : query.error instanceof Error ? (
        <div className="mt-8"><PageError message={query.error.message} /></div>
      ) : !query.data?.orders.length ? (
        <section className="mt-8 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <h2 className="font-semibold">No orders yet</h2>
          <Button asChild className="mt-4"><Link to="/shop">Browse products</Link></Button>
        </section>
      ) : (
        <div className="mt-8 grid gap-4">
          {query.data.orders.map((order) => {
            const payment = order.payments.at(-1);
            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="rounded-2xl border border-border bg-white p-5 transition hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(order.total, order.currency)}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {order.status.replaceAll("_", " ")} · Payment {payment?.status ?? "pending"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(" · ")}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

export function OrderDetailsPage() {
  const { session } = useAuth();
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["order", session?.user.id, orderId],
    queryFn: () =>
      apiRequest<{ order: Order }>(`/orders/${orderId}`, session?.access_token),
    enabled: Boolean(session?.access_token && orderId),
  });
  const retryMutation = useMutation({
    mutationFn: (simulatedResult: "success" | "failed") =>
      apiRequest("/payments/simulate", session?.access_token, {
        method: "POST",
        body: JSON.stringify({
          orderId,
          simulatedResult,
          idempotencyKey: crypto.randomUUID(),
        }),
      }),
    onSuccess: async () => {
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["orders", session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ["cart", session?.user.id] }),
      ]);
    },
  });
  if (query.isPending) {
    return <main className="mx-auto max-w-4xl px-6 py-12 text-sm text-muted-foreground">Loading order...</main>;
  }
  if (query.error instanceof Error) {
    return <main className="mx-auto max-w-4xl px-6 py-12"><PageError message={query.error.message} /></main>;
  }
  const order = query.data?.order;
  if (!order) return null;
  const payment = order.payments.at(-1);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Order details</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{order.order_number}</h1>
      <p className="mt-2 text-sm capitalize text-muted-foreground">
        {order.status.replaceAll("_", " ")} · Payment {payment?.status ?? "pending"}
      </p>
      <section className="mt-7 rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">Items</h2>
        <div className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>{item.product_name} × {item.quantity}</span>
              <span>{formatPrice(item.line_total, order.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-4 font-semibold">
          <span>Total</span><span>{formatPrice(order.total, order.currency)}</span>
        </div>
      </section>
      {payment && (
        <section className="mt-5 rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold">Payment</h2>
          <p className="mt-2 text-sm capitalize text-muted-foreground">
            {payment.method.replaceAll("_", " ")} · {payment.status} · {formatPrice(payment.amount, order.currency)}
          </p>
          {payment.transaction_reference && (
            <p className="mt-1 text-xs text-muted-foreground">Reference: {payment.transaction_reference}</p>
          )}
          {order.status === "payment_failed" && payment.method !== "cash_on_delivery" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={retryMutation.isPending} onClick={() => retryMutation.mutate("success")}>
                Simulate successful retry
              </Button>
              <Button
                variant="outline"
                disabled={retryMutation.isPending}
                onClick={() => retryMutation.mutate("failed")}
              >
                Simulate failed retry
              </Button>
            </div>
          )}
          {retryMutation.error instanceof Error && (
            <div className="mt-3"><PageError message={retryMutation.error.message} /></div>
          )}
        </section>
      )}
      <Button asChild variant="outline" className="mt-5"><Link to="/orders">Back to orders</Link></Button>
    </main>
  );
}
