import { Router } from "express";
import { z } from "zod";
import { sendDatabaseError } from "../../lib/api-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";

export const adminDashboardRoutes = Router();

const userIdSchema = z.string().uuid();
const staffRoleSchema = z.enum([
  "admin",
  "inventory_manager",
  "order_manager",
  "delivery_manager",
  "delivery_staff",
]);
const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "cancelled",
]);

adminDashboardRoutes.use(authenticate, requireAdmin);

adminDashboardRoutes.get(
  "/analytics",
  async (request, response) => {
    const { data, error } = await request.supabase!.rpc("get_admin_dashboard");
    if (error) {
      sendDatabaseError(response, error);
      return;
    }
    response.json({ analytics: data });
  },
);

adminDashboardRoutes.get("/orders", async (request, response) => {
  const { data, error } = await request.supabase!
    .from("orders")
    .select("id,order_number,user_id,status,currency,total,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ orders: data });
});

adminDashboardRoutes.patch("/orders/:orderId", async (request, response) => {
  const orderId = userIdSchema.safeParse(request.params.orderId);
  const status = orderStatusSchema.safeParse(request.body?.status);
  if (!orderId.success || !status.success) {
    response.status(400).json({ error: "Provide a valid order ID and order status." });
    return;
  }
  const { data, error } = await request.supabase!.rpc("admin_update_order_status", {
    p_order_id: orderId.data,
    p_status: status.data,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ order: data });
});

adminDashboardRoutes.get("/users", async (request, response) => {
  const profiles = await request.supabase!
    .from("profiles")
    .select("user_id,full_name,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (profiles.error) {
    sendDatabaseError(response, profiles.error);
    return;
  }
  if (profiles.data.length === 0) {
    response.json({ users: [] });
    return;
  }
  const roles = await request.supabase!
    .from("user_roles")
    .select("user_id,role")
    .in("user_id", profiles.data.map(({ user_id }) => user_id));
  if (roles.error) {
    sendDatabaseError(response, roles.error);
    return;
  }
  const rolesByUser = new Map<string, string[]>();
  for (const { user_id, role } of roles.data) {
    const userRoles = rolesByUser.get(user_id) ?? [];
    userRoles.push(role);
    rolesByUser.set(user_id, userRoles);
  }
  response.json({
    users: profiles.data.map((profile) => ({
      ...profile,
      roles: rolesByUser.get(profile.user_id) ?? [],
    })),
  });
});

adminDashboardRoutes.patch("/users/:userId/roles", async (request, response) => {
  const userId = userIdSchema.safeParse(request.params.userId);
  const role = staffRoleSchema.safeParse(request.body?.role);
  const enabled = z.boolean().safeParse(request.body?.enabled);
  if (!userId.success || !role.success || !enabled.success) {
    response.status(400).json({ error: "Provide a valid user ID, staff role, and enabled flag." });
    return;
  }
  if (!enabled.data && userId.data === request.authUser!.id && role.data === "admin") {
    response.status(400).json({ error: "You cannot remove your own administrator access." });
    return;
  }

  const query = request.supabase!.from("user_roles");
  const result = enabled.data
    ? await query.upsert(
        { user_id: userId.data, role: role.data },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      )
    : await query
        .delete()
        .eq("user_id", userId.data)
        .eq("role", role.data);
  if (result.error) {
    sendDatabaseError(response, result.error);
    return;
  }
  response.status(204).end();
});
