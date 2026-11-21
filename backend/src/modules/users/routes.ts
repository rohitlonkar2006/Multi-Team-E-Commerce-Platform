import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  createAddress,
  deleteAddress,
  getCurrentUser,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  updateProfile,
} from "./controller.js";

export const authRoutes = Router();
authRoutes.get("/me", authenticate, getCurrentUser);

export const userRoutes = Router();
userRoutes.use(authenticate);
userRoutes.get("/profile", getCurrentUser);
userRoutes.patch("/profile", updateProfile);
userRoutes.get("/addresses", listAddresses);
userRoutes.post("/addresses", createAddress);
userRoutes.patch("/addresses/:id", updateAddress);
userRoutes.patch("/addresses/:id/default", setDefaultAddress);
userRoutes.delete("/addresses/:id", deleteAddress);
