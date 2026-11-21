import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  addCartItem,
  checkout,
  deleteCartItem,
  getCart,
  getOrder,
  getPayment,
  listOrders,
  retryPayment,
  updateCartItem,
} from "./controller.js";

export const cartRoutes = Router();
cartRoutes.use(authenticate);
cartRoutes.get("/", getCart);
cartRoutes.post("/items", addCartItem);
cartRoutes.patch("/items/:id", updateCartItem);
cartRoutes.delete("/items/:id", deleteCartItem);

export const orderRoutes = Router();
orderRoutes.use(authenticate);
orderRoutes.get("/", listOrders);
orderRoutes.get("/:id", getOrder);
orderRoutes.post("/", checkout);

export const paymentRoutes = Router();
paymentRoutes.use(authenticate);
paymentRoutes.post("/simulate", retryPayment);
paymentRoutes.get("/:id", getPayment);
