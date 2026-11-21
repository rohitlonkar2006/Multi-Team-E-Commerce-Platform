import { Router } from "express";
import { sendDatabaseError } from "../../lib/api-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";

export const adminDashboardRoutes = Router();

adminDashboardRoutes.get(
  "/analytics",
  authenticate,
  requireAdmin,
  async (request, response) => {
    const { data, error } = await request.supabase!.rpc("get_admin_dashboard");
    if (error) {
      sendDatabaseError(response, error);
      return;
    }
    response.json({ analytics: data });
  },
);
