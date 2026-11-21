import type { RequestHandler } from "express";
import { addressIdSchema, addressSchema, addressUpdateSchema, profileUpdateSchema } from "./validation.js";
import { sendDatabaseError } from "../../lib/api-error.js";

function validationError(
  response: import("express").Response,
  issues: unknown,
): void {
  response.status(400).json({ error: "Invalid request data.", details: issues });
}

export const getCurrentUser: RequestHandler = async (request, response) => {
  const user = request.authUser!;
  const client = request.supabase!;
  const [profileResult, rolesResult] = await Promise.all([
    client.from("profiles").select("user_id,full_name,avatar_url,created_at,updated_at").eq("user_id", user.id).maybeSingle(),
    client.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  if (profileResult.error) {
    sendDatabaseError(response, profileResult.error);
    return;
  }
  if (rolesResult.error) {
    sendDatabaseError(response, rolesResult.error);
    return;
  }

  response.json({
    user: { id: user.id, email: user.email ?? null },
    profile: profileResult.data,
    roles: rolesResult.data.map(({ role }) => role),
  });
};

export const updateProfile: RequestHandler = async (request, response) => {
  const parsed = profileUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const user = request.authUser!;
  const client = request.supabase!;
  const { data, error } = await client
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      ...(parsed.data.avatarUrl !== undefined
        ? { avatar_url: parsed.data.avatarUrl || null }
        : {}),
    })
    .eq("user_id", user.id)
    .select("user_id,full_name,avatar_url,created_at,updated_at")
    .maybeSingle();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(404).json({ error: "Profile not found." });
    return;
  }
  response.json({ profile: data });
};

export const listAddresses: RequestHandler = async (request, response) => {
  const { data, error } = await request
    .supabase!.from("addresses")
    .select("id,label,recipient_name,phone,address_line_1,address_line_2,city,region,postal_code,country,is_default,created_at,updated_at")
    .eq("user_id", request.authUser!.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ addresses: data });
};

export const createAddress: RequestHandler = async (request, response) => {
  const parsed = addressSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(response, parsed.error.flatten());
    return;
  }

  const value = parsed.data;
  const { data, error } = await request
    .supabase!.from("addresses")
    .insert({
      user_id: request.authUser!.id,
      label: value.label,
      recipient_name: value.recipientName,
      phone: value.phone,
      address_line_1: value.addressLine1,
      address_line_2: value.addressLine2,
      city: value.city,
      region: value.region,
      postal_code: value.postalCode,
      country: value.country,
    })
    .select("id,label,recipient_name,phone,address_line_1,address_line_2,city,region,postal_code,country,is_default,created_at,updated_at")
    .single();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(201).json({ address: data });
};

export const updateAddress: RequestHandler = async (request, response) => {
  const id = addressIdSchema.safeParse(request.params.id);
  const parsed = addressUpdateSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    validationError(response, {
      ...(id.success ? {} : { id: id.error.flatten() }),
      ...(parsed.success ? {} : { body: parsed.error.flatten() }),
    });
    return;
  }

  const value = parsed.data;
  const { data, error } = await request
    .supabase!.from("addresses")
    .update({
      ...(value.label !== undefined ? { label: value.label } : {}),
      ...(value.recipientName !== undefined ? { recipient_name: value.recipientName } : {}),
      ...(value.phone !== undefined ? { phone: value.phone } : {}),
      ...(value.addressLine1 !== undefined ? { address_line_1: value.addressLine1 } : {}),
      ...(value.addressLine2 !== undefined ? { address_line_2: value.addressLine2 } : {}),
      ...(value.city !== undefined ? { city: value.city } : {}),
      ...(value.region !== undefined ? { region: value.region } : {}),
      ...(value.postalCode !== undefined ? { postal_code: value.postalCode } : {}),
      ...(value.country !== undefined ? { country: value.country } : {}),
    })
    .eq("id", id.data)
    .eq("user_id", request.authUser!.id)
    .select("id,label,recipient_name,phone,address_line_1,address_line_2,city,region,postal_code,country,is_default,created_at,updated_at")
    .maybeSingle();

  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (!data) {
    response.status(404).json({ error: "Address not found." });
    return;
  }
  response.json({ address: data });
};

export const setDefaultAddress: RequestHandler = async (request, response) => {
  const id = addressIdSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }

  const { error } = await request.supabase!.rpc("set_default_address", {
    p_address_id: id.data,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(204).end();
};

export const deleteAddress: RequestHandler = async (request, response) => {
  const id = addressIdSchema.safeParse(request.params.id);
  if (!id.success) {
    validationError(response, id.error.flatten());
    return;
  }

  const { error } = await request
    .supabase!.from("addresses")
    .delete()
    .eq("id", id.data)
    .eq("user_id", request.authUser!.id);
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(204).end();
};
