import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  Clock3,
  FileCheck2,
  MapPin,
  PackageCheck,
  ShieldAlert,
  Truck,
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type LicenseStatus = "missing" | "pending" | "approved" | "rejected";
type DeliveryStatus =
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery";

type DeliveryStaff = {
  user_id: string;
  email?: string;
  full_name: string;
  service_zone: string;
  license_status: LicenseStatus;
  license_rejection_reason: string;
  reviewed_at: string | null;
  is_active: boolean;
  created_at: string;
};

type DeliveryAddress = {
  recipient_name?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string | null;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

type AdminDeliveryOrder = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  currency: string;
  address: DeliveryAddress;
  delivery: {
    id: string;
    assigned_to: string;
    status: DeliveryStatus;
    tracking_code: string;
  } | null;
};

type DriverDelivery = {
  id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  status: DeliveryStatus;
  tracking_code: string;
  created_at: string;
  total: number;
  currency: string;
  payment_method: string | null;
  address: DeliveryAddress;
  items: Array<{ product_name: string; quantity: number }>;
};

type DriverDashboard = {
  profile: {
    full_name: string;
    service_zone: string;
    license_status: LicenseStatus;
    license_rejection_reason: string;
    is_active: boolean;
  };
  deliveries: DriverDelivery[];
};

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function addressLines(address: DeliveryAddress) {
  return [
    address.address_line_1,
    address.address_line_2,
    [address.city, address.region].filter(Boolean).join(", "),
    [address.postal_code, address.country].filter(Boolean).join(" "),
  ].filter(Boolean);
}

function matchesZone(zone: string, address: DeliveryAddress) {
  const normalizedZone = zone.trim().toLocaleLowerCase();
  return [address.city, address.postal_code].some(
    (value) => value?.trim().toLocaleLowerCase() === normalizedZone,
  );
}

function InlineAlert({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "info";
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm leading-6 ${styles[tone]}`}
    >
      {children}
    </p>
  );
}

function LicenseBadge({ status }: { status: LicenseStatus }) {
  const styles: Record<LicenseStatus, string> = {
    missing: "bg-slate-100 text-slate-700",
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-emerald-100 text-emerald-900",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function AdminDeliveryPage() {
  const { session, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    serviceZone: "",
  });
  const [zoneDrafts, setZoneDrafts] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [licenseLinks, setLicenseLinks] = useState<Record<string, string>>({});
  const [licenseLinkError, setLicenseLinkError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: ["admin-delivery-staff", isAdmin],
    queryFn: () =>
      apiRequest<{ staff: DeliveryStaff[] }>(
        isAdmin ? "/admin/delivery/staff" : "/delivery/manager/staff",
        session?.access_token,
      ),
    enabled: Boolean(session?.access_token),
  });
  const ordersQuery = useQuery({
    queryKey: ["admin-delivery-orders"],
    queryFn: () =>
      apiRequest<{ orders: AdminDeliveryOrder[] }>("/admin/delivery/orders", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const staff = staffQuery.data?.staff ?? [];
  const orders = ordersQuery.data?.orders ?? [];

  const refreshAdminData = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-delivery-staff"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-delivery-orders"] });
  };
  const inviteMutation = useMutation({
    mutationFn: (body: typeof inviteForm) =>
      apiRequest<{ message: string }>("/admin/delivery/staff", session?.access_token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      setInviteForm({ fullName: "", email: "", serviceZone: "" });
      setNotice(result.message);
      refreshAdminData();
    },
  });
  const updateStaffMutation = useMutation({
    mutationFn: ({ staffId, serviceZone, isActive }: {
      staffId: string;
      serviceZone: string;
      isActive: boolean;
    }) =>
      apiRequest(`/admin/delivery/staff/${staffId}`, session?.access_token, {
        method: "PATCH",
        body: JSON.stringify({ serviceZone, isActive }),
      }),
    onSuccess: refreshAdminData,
  });
  const reviewMutation = useMutation({
    mutationFn: ({ staffId, decision, rejectionReason }: {
      staffId: string;
      decision: "approved" | "rejected";
      rejectionReason?: string;
    }) =>
      apiRequest(`/admin/delivery/staff/${staffId}/license-review`, session?.access_token, {
        method: "POST",
        body: JSON.stringify({ decision, rejectionReason }),
      }),
    onSuccess: refreshAdminData,
  });
  const assignmentMutation = useMutation({
    mutationFn: ({ orderId, deliveryStaffId }: { orderId: string; deliveryStaffId: string }) =>
      apiRequest(`/admin/delivery/orders/${orderId}/assign`, session?.access_token, {
        method: "PUT",
        body: JSON.stringify({ deliveryStaffId }),
      }),
    onSuccess: refreshAdminData,
  });

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    inviteMutation.mutate(inviteForm);
  }

  async function openLicense(staffId: string) {
    setLicenseLinkError(null);
    try {
      const result = await apiRequest<{ url: string }>(
        `/admin/delivery/staff/${staffId}/license-url`,
        session?.access_token,
      );
      setLicenseLinks((links) => ({ ...links, [staffId]: result.url }));
    } catch (error) {
      setLicenseLinkError(messageOf(error));
    }
  }

  function assignOrder(order: AdminDeliveryOrder) {
    const deliveryStaffId = assignments[order.id] ?? order.delivery?.assigned_to ?? "";
    if (!deliveryStaffId) return;
    assignmentMutation.mutate({ orderId: order.id, deliveryStaffId });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="reveal-on-load flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Administration · delivery operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Delivery management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite delivery partners, review their licenses, manage service zones, and assign eligible orders.
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/admin/dashboard">Back to admin dashboard</Link></Button>
      </header>

      {notice && <div className="mt-5"><InlineAlert tone="success">{notice}</InlineAlert></div>}
      {inviteMutation.error instanceof Error && (
        <div className="mt-5"><InlineAlert>{messageOf(inviteMutation.error)}</InlineAlert></div>
      )}
      {updateStaffMutation.error instanceof Error && (
        <div className="mt-5"><InlineAlert>{messageOf(updateStaffMutation.error)}</InlineAlert></div>
      )}
      {reviewMutation.error instanceof Error && (
        <div className="mt-5"><InlineAlert>{messageOf(reviewMutation.error)}</InlineAlert></div>
      )}
      {assignmentMutation.error instanceof Error && (
        <div className="mt-5"><InlineAlert>{messageOf(assignmentMutation.error)}</InlineAlert></div>
      )}
      {!isAdmin && (
        <div className="mt-5">
          <InlineAlert tone="info">Delivery managers can assign zone-matched orders. Only administrators can create accounts, change service zones, or review licenses.</InlineAlert>
        </div>
      )}

      {isAdmin && (
        <section className="reveal-on-load mt-7 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserPlus size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Invite a delivery partner</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Only administrators can create delivery accounts. The partner receives an email invitation and must submit a license for review.
              </p>
            </div>
          </div>
          <form onSubmit={submitInvite} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Full name
              <input
                required
                maxLength={120}
                value={inviteForm.fullName}
                onChange={(event) => setInviteForm({ ...inviteForm, fullName: event.target.value })}
                className="h-11 min-w-0 rounded-xl border border-border px-3 font-normal outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Email
              <input
                required
                type="email"
                maxLength={254}
                value={inviteForm.email}
                onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
                className="h-11 min-w-0 rounded-xl border border-border px-3 font-normal outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Service zone
              <input
                required
                minLength={2}
                maxLength={100}
                value={inviteForm.serviceZone}
                onChange={(event) => setInviteForm({ ...inviteForm, serviceZone: event.target.value })}
                placeholder="City or postcode"
                className="h-11 min-w-0 rounded-xl border border-border px-3 font-normal outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" className="h-11 w-full" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Sending invite..." : "Send invitation"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="reveal-on-load mt-7 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Delivery partners</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drivers need an approved license and an active account before assignment.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            {staff.length} {isAdmin ? "accounts" : "eligible partners"}
          </span>
        </div>

        {staffQuery.isPending ? (
          <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">Loading delivery partners...</p>
        ) : staffQuery.error instanceof Error ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{messageOf(staffQuery.error)}</p>
        ) : staff.length === 0 ? (
          <p className="mt-5 rounded-xl bg-background p-5 text-sm text-muted-foreground">
            No delivery partners yet. Send an invitation to get started.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {staff.map((partner) => (
              <article key={partner.user_id} className="dashboard-card rounded-2xl border border-border p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{partner.full_name}</h3>
                    {partner.email && (
                      <p className="mt-1 break-all text-sm text-muted-foreground">{partner.email}</p>
                    )}
                  </div>
                  <LicenseBadge status={partner.license_status} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Service zone · city or postcode
                    <input
                      value={zoneDrafts[partner.user_id] ?? partner.service_zone}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        setZoneDrafts({ ...zoneDrafts, [partner.user_id]: event.target.value })
                      }
                      className="h-10 min-w-0 rounded-lg border border-border px-3 font-normal disabled:bg-muted"
                    />
                  </label>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateStaffMutation.isPending}
                      onClick={() =>
                        updateStaffMutation.mutate({
                          staffId: partner.user_id,
                          serviceZone: zoneDrafts[partner.user_id] ?? partner.service_zone,
                          isActive: partner.is_active,
                        })
                      }
                    >
                      Save zone
                    </Button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`size-2 rounded-full ${partner.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {partner.is_active ? "Active" : "Inactive"}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateStaffMutation.isPending}
                      onClick={() =>
                        updateStaffMutation.mutate({
                          staffId: partner.user_id,
                          serviceZone: zoneDrafts[partner.user_id] ?? partner.service_zone,
                          isActive: !partner.is_active,
                        })
                      }
                    >
                      {partner.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>

                {partner.license_status === "pending" && isAdmin && (
                  <div className="mt-4 grid gap-3 rounded-xl bg-amber-50 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <label className="grid gap-1 text-sm font-medium text-amber-950">
                      Rejection reason (required to reject)
                      <input
                        maxLength={500}
                        value={rejectionReasons[partner.user_id] ?? ""}
                        onChange={(event) =>
                          setRejectionReasons({
                            ...rejectionReasons,
                            [partner.user_id]: event.target.value,
                          })
                        }
                        className="h-10 min-w-0 rounded-lg border border-amber-200 bg-white px-3 font-normal"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openLicense(partner.user_id)}
                    >
                      <FileCheck2 size={15} className="mr-2" /> Open license
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({ staffId: partner.user_id, decision: "approved" })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          reviewMutation.isPending ||
                          (rejectionReasons[partner.user_id] ?? "").trim().length < 2
                        }
                        onClick={() =>
                          reviewMutation.mutate({
                            staffId: partner.user_id,
                            decision: "rejected",
                            rejectionReason: rejectionReasons[partner.user_id],
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                    {licenseLinks[partner.user_id] && (
                      <a
                        href={licenseLinks[partner.user_id]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-primary underline underline-offset-2 sm:col-span-3"
                      >
                        Open private license file <ArrowUpRight size={14} className="inline" />
                      </a>
                    )}
                    {licenseLinkError && (
                      <p role="alert" className="text-sm text-red-800 sm:col-span-3">{licenseLinkError}</p>
                    )}
                  </div>
                )}
                {partner.license_status === "rejected" && partner.license_rejection_reason && (
                  <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    Rejection reason: {partner.license_rejection_reason}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="reveal-on-load mt-7 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Orders awaiting delivery</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assignments are restricted to active, license-approved partners whose zone matches the order city or postcode.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            {orders.length} orders
          </span>
        </div>

        {ordersQuery.isPending ? (
          <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">Loading delivery orders...</p>
        ) : ordersQuery.error instanceof Error ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{messageOf(ordersQuery.error)}</p>
        ) : orders.length === 0 ? (
          <div className="mt-5 rounded-xl bg-background p-6 text-center">
            <PackageCheck className="mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">No orders need delivery assignment</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {orders.map((order) => {
              const eligiblePartners = staff.filter(
                (partner) =>
                  partner.is_active &&
                  partner.license_status === "approved" &&
                  matchesZone(partner.service_zone, order.address),
              );
              const currentPartner = staff.find(
                (partner) => partner.user_id === order.delivery?.assigned_to,
              );
              const assignmentCanChange =
                !order.delivery ||
                ["assigned", "failed_delivery"].includes(order.delivery.status) ||
                !currentPartner?.is_active ||
                currentPartner.license_status !== "approved";
              const selectedPartner =
                assignments[order.id] ?? order.delivery?.assigned_to ?? "";
              return (
                <article key={order.id} className="dashboard-card rounded-2xl border border-border p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{order.order_number}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(order.created_at)} · {statusLabel(order.status)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(order.total, order.currency)}</p>
                  </div>
                  <div className="mt-4 rounded-xl bg-background p-3 text-sm">
                    <p className="font-medium">{order.address.recipient_name || "Customer"}</p>
                    {addressLines(order.address).map((line, index) => (
                      <p key={`${order.id}-address-${index}`} className="mt-1 text-muted-foreground">{line}</p>
                    ))}
                    <p className="mt-1 text-xs font-medium text-primary">
                      Service zone: {order.address.city || "—"} · {order.address.postal_code || "—"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label className="grid gap-1.5 text-sm font-medium">
                      Assign to
                      <select
                        value={selectedPartner}
                        onChange={(event) =>
                          setAssignments({ ...assignments, [order.id]: event.target.value })
                        }
                        className="h-10 min-w-0 rounded-lg border border-border bg-white px-3 font-normal"
                      >
                        <option value="">Select an eligible partner</option>
                        {eligiblePartners.map((partner) => (
                          <option key={partner.user_id} value={partner.user_id}>
                            {partner.full_name} · {partner.service_zone}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <Button
                        className="w-full sm:w-auto"
                        disabled={
                          assignmentMutation.isPending ||
                          !assignmentCanChange ||
                          !selectedPartner ||
                          !eligiblePartners.some((partner) => partner.user_id === selectedPartner)
                        }
                        onClick={() => assignOrder(order)}
                      >
                        {order.delivery ? "Reassign" : "Assign order"}
                      </Button>
                    </div>
                  </div>
                  {!assignmentCanChange && (
                    <p className="mt-3 text-xs text-amber-800">
                      This delivery is already in progress. Reassignment is available after the current partner is deactivated.
                    </p>
                  )}
                  {order.delivery && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Tracking {order.delivery.tracking_code} · {statusLabel(order.delivery.status)}
                    </p>
                  )}
                  {eligiblePartners.length === 0 && (
                    <p className="mt-3 text-xs text-amber-800">
                      No active, approved partner serves this city or postcode yet.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const nextStatus: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "out_for_delivery",
  out_for_delivery: "delivered",
};

const nextAction: Partial<Record<DeliveryStatus, string>> = {
  assigned: "Mark picked up",
  picked_up: "Start transit",
  in_transit: "Out for delivery",
  out_for_delivery: "Mark delivered",
};

function LicenseUploadPanel({
  status,
  rejectionReason,
  accessToken,
  onUploaded,
}: {
  status: LicenseStatus;
  rejectionReason: string;
  accessToken?: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest<{ license: unknown }>("/delivery/license", accessToken, {
        method: "POST",
        body: formData,
      }),
    onSuccess: () => {
      setFile(null);
      onUploaded();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      uploadMutation.reset();
      return;
    }
    const formData = new FormData();
    formData.append("license", file);
    uploadMutation.mutate(formData);
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-900">
          {status === "pending" ? <Clock3 size={19} /> : <FileCheck2 size={19} />}
        </span>
        <div>
          <h2 className="font-semibold">
            {status === "pending" ? "License under review" : "Submit your driving license"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {status === "pending"
              ? "Your delivery access will be enabled after an administrator reviews your license."
              : "Upload a clear photo or PDF. The file is private and can only be opened by administrators."}
          </p>
        </div>
      </div>
      {status === "rejected" && rejectionReason && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Previous submission needs attention: {rejectionReason}
        </p>
      )}
      {status !== "pending" && (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium">
            License file
            <input
              type="file"
              required
              accept="image/jpeg,image/png,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="min-h-11 w-full rounded-xl border border-border bg-background p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:font-semibold file:text-secondary-foreground"
            />
          </label>
          <Button type="submit"           disabled={!file || file.size > 5 * 1024 * 1024 || uploadMutation.isPending}>
            {uploadMutation.isPending ? "Uploading securely..." : "Submit for review"}
          </Button>
          {file && file.size > 5 * 1024 * 1024 && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">Choose a file smaller than 5 MB.</p>
          )}
          {uploadMutation.error instanceof Error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">{messageOf(uploadMutation.error)}</p>
          )}
        </form>
      )}
    </section>
  );
}

export function DeliveryDashboardPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
  const dashboardQuery = useQuery({
    queryKey: ["delivery-dashboard", session?.user.id],
    queryFn: () =>
      apiRequest<DriverDashboard>("/delivery/dashboard", session?.access_token),
    enabled: Boolean(session?.access_token),
  });
  const statusMutation = useMutation({
    mutationFn: ({ deliveryId, status, note }: {
      deliveryId: string;
      status: DeliveryStatus;
      note: string;
    }) =>
      apiRequest(`/delivery/orders/${deliveryId}/status`, session?.access_token, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["delivery-dashboard", session?.user.id] }),
  });
  const dashboard = dashboardQuery.data;
  const activeCount = dashboard?.deliveries.filter(
    (delivery) => !["delivered", "failed_delivery"].includes(delivery.status),
  ).length ?? 0;

  if (dashboardQuery.isPending) {
    return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground sm:px-6">Loading your delivery dashboard...</main>;
  }
  if (dashboardQuery.error instanceof Error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <InlineAlert>{messageOf(dashboardQuery.error)}</InlineAlert>
      </main>
    );
  }
  if (!dashboard) return null;

  const canReceiveOrders =
    dashboard.profile.is_active && dashboard.profile.license_status === "approved";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="reveal-on-load rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-80">Delivery partner portal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hello, {dashboard.profile.full_name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-85">
              View and update only the deliveries assigned to your account.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <Truck size={25} aria-hidden="true" />
            <p className="mt-3 text-xs opacity-80">Your service zone</p>
            <p className="mt-1 font-semibold">{dashboard.profile.service_zone}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold capitalize">
            <FileCheck2 size={14} /> License {dashboard.profile.license_status}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
            <PackageCheck size={14} /> {activeCount} active deliveries
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
            <MapPin size={14} /> Zone based · no GPS tracking
          </span>
        </div>
      </header>

      {!canReceiveOrders && (
        <div className="reveal-on-load mt-5">
          {!dashboard.profile.is_active ? (
            <InlineAlert tone="info">
              Your delivery account is inactive. Contact an administrator if you think this is unexpected.
            </InlineAlert>
          ) : dashboard.profile.license_status === "pending" ? (
            <InlineAlert tone="info">Your license is being reviewed. Assigned deliveries will appear after approval.</InlineAlert>
          ) : (
            <LicenseUploadPanel
              status={dashboard.profile.license_status}
              rejectionReason={dashboard.profile.license_rejection_reason}
              accessToken={session?.access_token}
              onUploaded={() =>
                void queryClient.invalidateQueries({
                  queryKey: ["delivery-dashboard", session?.user.id],
                })
              }
            />
          )}
        </div>
      )}

      {statusMutation.error instanceof Error && (
        <div className="mt-5"><InlineAlert>{messageOf(statusMutation.error)}</InlineAlert></div>
      )}

      <section className="reveal-on-load mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Your assigned deliveries</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivery eligibility is matched by your service zone; assignments are made by an administrator.
            </p>
          </div>
        </div>

        {!canReceiveOrders ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
            <ShieldAlert className="mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">Delivery access is not active</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your orders will become visible after account activation and license approval.
            </p>
          </div>
        ) : dashboard.deliveries.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-7 text-center">
            <Truck className="mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">No deliveries assigned yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only orders assigned to you by an administrator will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {dashboard.deliveries.map((delivery) => {
              const action = nextAction[delivery.status];
              return (
                <article key={delivery.id} className="dashboard-card rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{delivery.tracking_code}</p>
                      <h3 className="mt-1 text-lg font-semibold">{delivery.order_number}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Assigned {formatDate(delivery.created_at)} · {statusLabel(delivery.status)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatPrice(delivery.total, delivery.currency)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {delivery.payment_method === "cash_on_delivery" ? "Cash on delivery" : "Paid online"}
                      </p>
                      <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        delivery.status === "delivered"
                          ? "bg-emerald-100 text-emerald-900"
                          : delivery.status === "failed_delivery"
                            ? "bg-red-100 text-red-800"
                            : "bg-secondary text-secondary-foreground"
                      }`}>
                        {delivery.status === "delivered" ? <Check size={13} /> : <Clock3 size={13} />}
                        {statusLabel(delivery.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-xl bg-background p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deliver to</h4>
                      <p className="mt-2 text-sm font-semibold">{delivery.address.recipient_name || "Customer"}</p>
                      {addressLines(delivery.address).map((line, index) => (
                        <p key={`${delivery.id}-address-${index}`} className="mt-1 text-sm text-muted-foreground">{line}</p>
                      ))}
                      {delivery.address.phone && (
                        <a className="mt-2 inline-block text-sm font-semibold text-primary underline" href={`tel:${delivery.address.phone}`}>
                          Call {delivery.address.phone}
                        </a>
                      )}
                    </section>
                    <section className="rounded-xl bg-background p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order items</h4>
                      <ul className="mt-2 grid gap-1.5">
                        {delivery.items.map((item, index) => (
                          <li key={`${delivery.id}-item-${index}`} className="flex justify-between gap-3 text-sm">
                            <span>{item.product_name}</span>
                            <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  {action && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <label className="grid gap-1.5 text-sm font-medium">
                        Delivery note (optional)
                        <input
                          maxLength={500}
                          value={statusNotes[delivery.id] ?? ""}
                          onChange={(event) =>
                            setStatusNotes({ ...statusNotes, [delivery.id]: event.target.value })
                          }
                          placeholder="Add a short delivery update"
                          className="h-10 min-w-0 rounded-lg border border-border px-3 font-normal"
                        />
                      </label>
                      <div className="flex flex-wrap items-end gap-2">
                        <Button
                          className="w-full sm:w-auto"
                          disabled={statusMutation.isPending}
                          onClick={() => {
                            const status = nextStatus[delivery.status];
                            if (!status) return;
                            statusMutation.mutate({
                              deliveryId: delivery.id,
                              status,
                              note: statusNotes[delivery.id] ?? "",
                            });
                          }}
                        >
                          {action}
                        </Button>
                        {delivery.status === "out_for_delivery" && (
                          <Button
                            variant="outline"
                            className="w-full text-red-700 sm:w-auto"
                            disabled={
                              statusMutation.isPending ||
                              (statusNotes[delivery.id] ?? "").trim().length < 2
                            }
                            onClick={() =>
                              statusMutation.mutate({
                                deliveryId: delivery.id,
                                status: "failed_delivery",
                                note: statusNotes[delivery.id] ?? "",
                              })
                            }
                          >
                            Report failed delivery
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
