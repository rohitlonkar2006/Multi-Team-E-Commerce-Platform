import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  addWishlistItem,
  listWishlist,
  removeWishlistItem,
} from "./controller.js";

export const wishlistRoutes = Router();
wishlistRoutes.use(authenticate);
wishlistRoutes.get("/", listWishlist);
wishlistRoutes.post("/", addWishlistItem);
wishlistRoutes.delete("/:productId", removeWishlistItem);
