import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { requireDeliveryStaff } from "../../middleware/require-delivery-staff.js";
import { requireDeliveryOperations } from "../../middleware/require-delivery-operations.js";
import {
  assignDelivery,
  createDeliveryStaff,
  getAdminDeliveryQueue,
  getDeliveryDashboard,
  getLicenseReviewUrl,
  licenseUpload,
  listDeliveryStaff,
  listAssignableDeliveryStaff,
  reviewDeliveryLicense,
  submitDeliveryLicense,
  updateAssignedDeliveryStatus,
  updateDeliveryStaff,
} from "./controller.js";

export const deliveryStaffRoutes = Router();
deliveryStaffRoutes.get(
  "/dashboard",
  authenticate,
  requireDeliveryStaff,
  getDeliveryDashboard,
);
deliveryStaffRoutes.post(
  "/license",
  authenticate,
  requireDeliveryStaff,
  licenseUpload.single("license"),
  submitDeliveryLicense,
);
deliveryStaffRoutes.patch(
  "/orders/:deliveryId/status",
  authenticate,
  requireDeliveryStaff,
  updateAssignedDeliveryStatus,
);

export const adminDeliveryRoutes = Router();
adminDeliveryRoutes.get("/staff", authenticate, requireAdmin, listDeliveryStaff);
adminDeliveryRoutes.post("/staff", authenticate, requireAdmin, createDeliveryStaff);
adminDeliveryRoutes.patch("/staff/:staffId", authenticate, requireAdmin, updateDeliveryStaff);
adminDeliveryRoutes.get(
  "/staff/:staffId/license-url",
  authenticate,
  requireAdmin,
  getLicenseReviewUrl,
);
adminDeliveryRoutes.post(
  "/staff/:staffId/license-review",
  authenticate,
  requireAdmin,
  reviewDeliveryLicense,
);
adminDeliveryRoutes.get(
  "/orders",
  authenticate,
  requireDeliveryOperations,
  getAdminDeliveryQueue,
);
adminDeliveryRoutes.put(
  "/orders/:orderId/assign",
  authenticate,
  requireDeliveryOperations,
  assignDelivery,
);

export const deliveryOperationsRoutes = Router();
deliveryOperationsRoutes.get(
  "/manager/staff",
  authenticate,
  requireDeliveryOperations,
  listAssignableDeliveryStaff,
);
