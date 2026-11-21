import type { RequestHandler } from "express";
import { sendDatabaseError } from "../../lib/api-error.js";
import {
  cartItemIdSchema,
  cartItemSchema,
  cartItemUpdateSchema,
  checkoutSchema,
  orderIdSchema,
  paymentIdSchema,
  paymentRetrySchema,
} from "./validation.js";

function invalidRequest(response: import("express").Response, details: unknown) {
  response.status(400).json({ error: "Invalid request data.", details });
}

export const getCart: RequestHandler = async (request, response) => {
  const { data, error } = await request.supabase!.rpc("get_my_cart");
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ cart: data });
};

export const addCartItem: RequestHandler = async (request, response) => {
  const parsed = cartItemSchema.safeParse(request.body);
  if (!parsed.success) {
    invalidRequest(response, parsed.error.flatten());
    return;
  }

  const { data, error } = await request.supabase!.rpc("add_cart_item", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(200).json({ cart: data });
};

export const updateCartItem: RequestHandler = async (request, response) => {
  const id = cartItemIdSchema.safeParse(request.params.id);
  const parsed = cartItemUpdateSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    invalidRequest(response, {
      ...(id.success ? {} : { id: id.error.flatten() }),
      ...(parsed.success ? {} : { body: parsed.error.flatten() }),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc("set_cart_item_quantity", {
    p_item_id: id.data,
    p_quantity: parsed.data.quantity,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ cart: data });
};

export const deleteCartItem: RequestHandler = async (request, response) => {
  const id = cartItemIdSchema.safeParse(request.params.id);
  if (!id.success) {
    invalidRequest(response, id.error.flatten());
    return;
  }

  const { data, error } = await request.supabase!.rpc("remove_cart_item", {
    p_item_id: id.data,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ cart: data });
};

export const checkout: RequestHandler = async (request, response) => {
  const parsed = checkoutSchema.safeParse(request.body);
  if (!parsed.success) {
    invalidRequest(response, parsed.error.flatten());
    return;
  }

  const { data, error } = await request.supabase!.rpc("checkout_cart", {
    p_address_id: parsed.data.addressId,
    p_payment_method: parsed.data.paymentMethod,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_simulated_result: parsed.data.simulatedResult,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(201).json({ checkout: data });
};

export const retryPayment: RequestHandler = async (request, response) => {
  const parsed = paymentRetrySchema.safeParse(request.body);
  if (!parsed.success) {
    invalidRequest(response, parsed.error.flatten());
    return;
  }

  const { data, error } = await request.supabase!.rpc("retry_simulated_payment", {
    p_order_id: parsed.data.orderId,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_simulated_result: parsed.data.simulatedResult,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ payment: data });
};

export const getPayment: RequestHandler = async (request, response) => {
  const id = paymentIdSchema.safeParse(request.params.id);
  if (!id.success) {
    invalidRequest(response, id.error.flatten());
    return;
  }

  const { data, error } = await request.supabase!.rpc("get_my_payment", {
    p_payment_id: id.data,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (data === null) {
    response.status(404).json({ error: "Payment not found." });
    return;
  }
  response.json({ payment: data });
};

export const listOrders: RequestHandler = async (request, response) => {
  const { data, error } = await request.supabase!.rpc("get_my_orders");
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ orders: data });
};

export const getOrder: RequestHandler = async (request, response) => {
  const id = orderIdSchema.safeParse(request.params.id);
  if (!id.success) {
    invalidRequest(response, id.error.flatten());
    return;
  }

  const { data, error } = await request.supabase!.rpc("get_my_order", {
    p_order_id: id.data,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  if (data === null) {
    response.status(404).json({ error: "Order not found." });
    return;
  }
  response.json({ order: data });
};
