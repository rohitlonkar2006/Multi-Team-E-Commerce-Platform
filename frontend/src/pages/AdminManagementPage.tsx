import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type AdminOrder = {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  currency: string;
  total: number;
  created_at: string;
};

type AdminUser = {
  user_id: string;
  full_name: string;
  created_at: string;
  roles: string[];
};

const editableStatuses = ["pending", "confirmed", "processing", "shipped", "cancelled"];
const assignableRoles = [
  "admin",
  "inventory_manager",
  "order_manager",
  "delivery_manager",
  "delivery_staff",
];

function AdminPageHeader({
  title,
  description,
  showDashboardLink = true,
}: {
  title: string;
  description: string;
  showDashboardLink?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Administration</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {showDashboardLink && (
        <Link to="/admin/dashboard" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
          Back to dashboard
        </Link>
      )}
    </div>
  );
}

function PageError({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</p>;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdminOrdersPage({ staffMode = false }: { staffMode?: boolean }) {
  const { session } = useAuth();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => apiRequest<{ orders: AdminOrder[] }>("/admin/orders", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const updateOrder = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest<{ order: { id: string; status: string } }>(`/admin/orders/${id}`, session?.access_token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: ({ order }) => {
      client.setQueryData<{ orders: AdminOrder[] }>(["admin-orders"], (current) =>
        current
          ? {
              orders: current.orders.map((item) =>
                item.id === order.id ? { ...item, status: order.status } : item,
              ),
            }
          : current,
      );
      void client.invalidateQueries({ queryKey: ["admin-orders"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });
  const orders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (ordersQuery.data?.orders ?? []).filter((order) =>
      `${order.order_number} ${order.user_id} ${order.status}`.toLowerCase().includes(term),
    );
  }, [ordersQuery.data?.orders, search]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <AdminPageHeader
        title={staffMode ? "Order workspace" : "Order management"}
        description="Review recent orders and update their fulfilment status."
        showDashboardLink={!staffMode}
      />
      <section className="mt-7 rounded-2xl border border-border bg-white p-5 sm:p-6">
        <label className="grid max-w-md gap-2 text-sm font-medium">
          Search orders
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order number, customer ID, or status"
            className="h-10 rounded-xl border border-border bg-background px-3 font-normal"
          />
        </label>
        {ordersQuery.isPending ? (
          <p className="mt-5 text-sm text-muted-foreground">Loading orders...</p>
        ) : ordersQuery.error instanceof Error ? (
          <div className="mt-5"><PageError message={ordersQuery.error.message} /></div>
        ) : updateOrder.error instanceof Error ? (
          <div className="mt-5"><PageError message={updateOrder.error.message} /></div>
        ) : orders.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">No matching orders.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Order</th>
                  <th className="py-3 pr-4 font-medium">Customer ID</th>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 text-right font-medium">Total</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const canUpdate = !["delivered", "cancelled", "payment_failed", "out_for_delivery"].includes(order.status);
                  return (
                    <tr key={order.id}>
                      <td className="py-3 pr-4 font-semibold">{order.order_number}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{order.user_id}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(order.created_at))}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">{formatAmount(order.total, order.currency)}</td>
                      <td className="py-3">
                        {canUpdate ? (
                          <select
                            aria-label={`Update status for ${order.order_number}`}
                            value={order.status}
                            disabled={updateOrder.isPending}
                            onChange={(event) => updateOrder.mutate({ id: order.id, status: event.target.value })}
                            className="h-9 rounded-lg border border-border bg-white px-2 capitalize"
                          >
                            {editableStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                          </select>
                        ) : (
                          <span className="capitalize">{order.status.replaceAll("_", " ")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">Showing up to 200 most recent orders. Terminal and delivery-managed statuses cannot be changed here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export function AdminUsersPage() {
  const { session, account } = useAuth();
  const client = useQueryClient();
  const [view, setView] = useState<"customers" | "staff">("customers");
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<{ users: AdminUser[] }>("/admin/users", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const changeRole = useMutation({
    mutationFn: ({ userId, role, enabled }: { userId: string; role: string; enabled: boolean }) =>
      apiRequest(`/admin/users/${userId}/roles`, session?.access_token, {
        method: "PATCH",
        body: JSON.stringify({ role, enabled }),
      }),
    onSuccess: (_data, { userId, role, enabled }) => {
      client.setQueryData<{ users: AdminUser[] }>(["admin-users"], (current) =>
        current
          ? {
              users: current.users.map((user) => {
                if (user.user_id !== userId) return user;
                const roles = enabled
                  ? [...new Set([...user.roles, role])]
                  : user.roles.filter((existingRole) => existingRole !== role);
                return { ...user, roles };
              }),
            }
          : current,
      );
      void client.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const users = usersQuery.data?.users ?? [];
  const visibleUsers = view === "customers"
    ? users.filter((user) => user.roles.includes("customer"))
    : users;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <AdminPageHeader title="Customers & staff" description="Review customer accounts and manage staff access." />
      <div className="mt-6 flex gap-2" role="tablist" aria-label="Account management">
        <Button type="button" variant={view === "customers" ? "default" : "outline"} role="tab" aria-selected={view === "customers"} onClick={() => setView("customers")}>Customers</Button>
        <Button type="button" variant={view === "staff" ? "default" : "outline"} role="tab" aria-selected={view === "staff"} onClick={() => setView("staff")}>Staff access</Button>
      </div>
      <section className="mt-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
        {usersQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        ) : usersQuery.error instanceof Error ? (
          <PageError message={usersQuery.error.message} />
        ) : changeRole.error instanceof Error ? (
          <PageError message={changeRole.error.message} />
        ) : visibleUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Account ID</th>
                  <th className="py-3 pr-4 font-medium">Roles</th>
                  {view === "staff" && <th className="py-3 font-medium">Manage access</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td className="py-3 pr-4 font-medium">{user.full_name || "Unnamed customer"}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{user.user_id}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => <span key={role} className="rounded-full bg-secondary px-2 py-1 text-xs capitalize">{role.replaceAll("_", " ")}</span>)}
                      </div>
                    </td>
                    {view === "staff" && (
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {assignableRoles.map((role) => {
                            const enabled = user.roles.includes(role);
                            return (
                              <label key={role} className="inline-flex items-center gap-1.5 text-xs capitalize">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  disabled={
                                    changeRole.isPending ||
                                    (role === "delivery_staff" && !enabled) ||
                                    (user.user_id === account?.user.id &&
                                      role === "admin" &&
                                      enabled)
                                  }
                                  title={
                                    role === "delivery_staff" && !enabled
                                      ? "Use Delivery Management to invite delivery staff."
                                      : undefined
                                  }
                                  onChange={(event) => changeRole.mutate({ userId: user.user_id, role, enabled: event.target.checked })}
                                />
                                {role.replaceAll("_", " ")}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              {view === "customers"
                ? "Customer email addresses are not displayed. Only the 200 most recently created profiles are shown."
                : "Only the 200 most recently created profiles are shown. Assign only the access each staff member needs. Create delivery staff through Delivery Management so their delivery profile is provisioned."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
