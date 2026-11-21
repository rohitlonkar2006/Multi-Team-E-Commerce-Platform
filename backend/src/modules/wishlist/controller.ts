import type { RequestHandler } from "express";
import { z } from "zod";
import { sendDatabaseError } from "../../lib/api-error.js";

const productIdSchema = z.string().uuid();

export const listWishlist: RequestHandler = async (request, response) => {
  const { data, error } = await request.supabase!.rpc("get_my_wishlist");
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ items: data });
};

export const addWishlistItem: RequestHandler = async (request, response) => {
  const parsed = z.object({ productId: productIdSchema }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid request data.",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc("add_to_wishlist", {
    p_product_id: parsed.data.productId,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.status(200).json({ items: data });
};

export const removeWishlistItem: RequestHandler = async (request, response) => {
  const parsed = productIdSchema.safeParse(request.params.productId);
  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid product ID.",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { data, error } = await request.supabase!.rpc("remove_from_wishlist", {
    p_product_id: parsed.data,
  });
  if (error) {
    sendDatabaseError(response, error);
    return;
  }
  response.json({ items: data });
};
