import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { ApiError, sendDatabaseError } from "../../lib/api-error.js";
import { getServiceRoleClient } from "../../lib/supabase.js";
import {
  assignDeliverySchema,
  deliveryStaffIdSchema,
  deliveryStatusSchema,
  inviteDeliveryStaffSchema,
  reviewLicenseSchema,
  updateDeliveryStaffSchema,
} from "./validation.js";

const licenseMimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export const licenseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!licenseMimeExtensions[file.mimetype]) {
      callback(new ApiError(400, "Upload a JPEG, PNG, or PDF license file."));
      return;
    }
    callback(null, true);
  },
});

function validationError(
  response: import("express").Response,
  details: unknown,
): void {
  response.status(400).json({ error: "Invalid request data.", details });
}

function isValidFileSignature(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  }
  return false;
}

export const createDeliveryStaff: RequestHandler = async (request, response) => {
  const parsed = inviteDeliveryStaffSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const serviceClient = getServiceRoleClient();
  const { fullName, email, serviceZone } = parsed.data;
  const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${env.FRONTEND_URL}/reset-password`,
  });
  if (error || !data.user) {
    response.status(error?.message.toLowerCase().includes("already") ? 409 : 502).json({
      error: error?.message.toLowerCase().includes("already")
        ? "An account with that email already exists."
        : "The delivery invitation could not be sent.",
    });
    return;
  }

  const userId = data.user.id;
  const { error: roleError } = await serviceClient
    .from("user_roles")
    .upsert({ user_id: userId, role: "delivery_staff" }, { onConflict: "user_id,role" });
  const { error: customerRoleError } = roleError
    ? { error: null }
    : await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "customer");
  const { error: profileError } =
    roleError || customerRoleError
      ? { error: null }
      : await serviceClient.from("delivery_staff_profiles").insert({
          user_id: userId,
          email,
          full_name: fullName,
          service_zone: serviceZone,
        });

  if (roleError || customerRoleError || profileError) {
    const cleanupResult = await serviceClient.auth.admin.deleteUser(userId);
    if (cleanupResult.error) {
      console.error("Could not remove a partially provisioned delivery account.", {
        userId,
        error: cleanupResult.error.message,
      });
    }
    console.error("Delivery account provisioning failed.", {
      userId,
      error: roleError?.message ?? customerRoleError?.message ?? profileError?.message,
    });
    response.status(500).json({ error: "The delivery account could not be provisioned." });
    return;
  }

  response.status(201).json({
    staff: {
      user_id: userId,
      email,
      full_name: fullName,
      service_zone: serviceZone,
      license_status: "missing",
      is_active: true,
    },
    message: "Invitation sent. The driver must upload a license before receiving deliveries.",
  });
};

export const listDeliveryStaff: RequestHandler = async (request, response) => {
  const { data, error } = await request
    .supabase!.from("delivery_staff_profiles")
    .select(
      "user_id,email,full_name,service_zone,license_status,license_rejection_reason,reviewed_at,is_active,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ staff: data });
};

export const listAssignableDeliveryStaff: RequestHandler = async (
  request,
  response,
) => {
  const { data, error } = await request.supabase!.rpc(
    "get_assignable_delivery_staff",
  );
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ staff: data });
};

export const updateDeliveryStaff: RequestHandler = async (request, response) => {
  const id = deliveryStaffIdSchema.safeParse(request.params.staffId);
  const parsed = updateDeliveryStaffSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    validationError(response, {
      ...(id.success ? {} : { staffId: id.error.flatten() }),
      ...(parsed.success ? {} : { body: parsed.error.flatten() }),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc("admin_update_delivery_staff", {
    p_delivery_staff_id: id.data,
    p_service_zone: parsed.data.serviceZone,
    p_is_active: parsed.data.isActive,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ staff: data });
};

export const getLicenseReviewUrl: RequestHandler = async (request, response) => {
  const id = deliveryStaffIdSchema.safeParse(request.params.staffId);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }

  const { data, error } = await request
    .supabase!.from("delivery_staff_profiles")
    .select("license_storage_path,license_status")
    .eq("user_id", id.data)
    .maybeSingle();
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data?.license_storage_path) {
    response.status(404).json({ error: "No license file was uploaded." });
    return;
  }
  if (data.license_status !== "pending") {
    response.status(409).json({ error: "Only pending license files can be reviewed." });
    return;
  }

  const { data: signedFile, error: storageError } = await getServiceRoleClient()
    .storage.from("delivery-licenses")
    .createSignedUrl(data.license_storage_path, 60);
  if (storageError || !signedFile) {
    console.error("Could not create a temporary license review link.", storageError);
    response.status(502).json({ error: "The private license file could not be opened." });
    return;
  }
  response.json({ url: signedFile.signedUrl, expiresInSeconds: 60 });
};

export const reviewDeliveryLicense: RequestHandler = async (request, response) => {
  const id = deliveryStaffIdSchema.safeParse(request.params.staffId);
  const parsed = reviewLicenseSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    validationError(response, {
      ...(id.success ? {} : { staffId: id.error.flatten() }),
      ...(parsed.success ? {} : { body: parsed.error.flatten() }),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc("admin_review_delivery_license", {
    p_delivery_staff_id: id.data,
    p_decision: parsed.data.decision,
    p_rejection_reason:
      parsed.data.decision === "rejected" ? parsed.data.rejectionReason : "",
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ review: data });
};

export const getAdminDeliveryQueue: RequestHandler = async (request, response) => {
  const { data, error } = await request.supabase!.rpc("get_admin_delivery_queue");
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ orders: data });
};

export const assignDelivery: RequestHandler = async (request, response) => {
  const orderId = deliveryStaffIdSchema.safeParse(request.params.orderId);
  const parsed = assignDeliverySchema.safeParse(request.body);
  if (!orderId.success || !parsed.success) {
    validationError(response, {
      ...(orderId.success ? {} : { orderId: orderId.error.flatten() }),
      ...(parsed.success ? {} : { body: parsed.error.flatten() }),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc("admin_assign_delivery", {
    p_order_id: orderId.data,
    p_delivery_staff_id: parsed.data.deliveryStaffId,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ delivery: data });
};

export const getDeliveryDashboard: RequestHandler = async (request, response) => {
  const { data, error } = await request.supabase!.rpc("get_my_delivery_dashboard");
  if (error) {
    if (
      error.code === "P0002" &&
      error.message === "Delivery staff profile was not found"
    ) {
      response.status(409).json({
        error: "Your delivery profile is not set up. Ask an administrator to invite you through Delivery Management.",
      });
      return;
    }
    sendDatabaseError(response, error);
    return;
  }
  response.json(data);
};

export const submitDeliveryLicense: RequestHandler = async (request, response) => {
  const file = request.file;
  if (!file) {
    response.status(400).json({ error: "Choose a JPEG, PNG, or PDF license file." });
    return;
  }
  if (!isValidFileSignature(file.mimetype, file.buffer)) {
    response.status(400).json({ error: "The file content does not match its file type." });
    return;
  }

  const userId = request.authUser!.id;
  const extension = licenseMimeExtensions[file.mimetype];
  const storagePath = `${userId}/${randomUUID()}.${extension}`;
  const serviceClient = getServiceRoleClient();
  const { data: currentProfile, error: profileError } = await request
    .supabase!.from("delivery_staff_profiles")
    .select("license_storage_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) {
    sendDatabaseError(response, profileError);
    return;
  }
  if (!currentProfile) {
    response.status(404).json({ error: "Delivery staff profile was not found." });
    return;
  }

  const { error: uploadError } = await serviceClient.storage
    .from("delivery-licenses")
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (uploadError) {
    console.error("Private delivery license upload failed.", uploadError);
    response.status(502).json({ error: "The license file could not be stored securely." });
    return;
  }

  const { data, error } = await request.supabase!.rpc("submit_delivery_license", {
    p_storage_path: storagePath,
  });
  if (error) {
    const { error: cleanupError } = await serviceClient.storage
      .from("delivery-licenses")
      .remove([storagePath]);
    if (cleanupError) {
      console.error("Could not remove an unregistered license upload.", cleanupError);
    }
    sendDatabaseError(response, error);
    return;
  }

  if (currentProfile.license_storage_path) {
    const { error: oldFileError } = await serviceClient.storage
      .from("delivery-licenses")
      .remove([currentProfile.license_storage_path]);
    if (oldFileError) {
      console.error("Could not remove a superseded private license file.", oldFileError);
    }
  }
  response.status(201).json({ license: data });
};

export const updateAssignedDeliveryStatus: RequestHandler = async (
  request,
  response,
) => {
  const deliveryId = deliveryStaffIdSchema.safeParse(request.params.deliveryId);
  const parsed = deliveryStatusSchema.safeParse(request.body);
  if (!deliveryId.success || !parsed.success) {
    validationError(response, {
      ...(deliveryId.success ? {} : { deliveryId: deliveryId.error.flatten() }),
      ...(parsed.success ? {} : { body: parsed.error.flatten() }),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc(
    "update_assigned_delivery_status",
    {
      p_delivery_id: deliveryId.data,
      p_status: parsed.data.status,
      p_note: parsed.data.note,
    },
  );
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ delivery: data });
};
