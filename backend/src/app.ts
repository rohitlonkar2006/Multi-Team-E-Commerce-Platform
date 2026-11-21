import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { MulterError } from "multer";
import { env } from "./config/env.js";
import { supabase } from "./lib/supabase.js";
import { ApiError } from "./lib/api-error.js";
import {
  adminCategoriesRoutes,
  adminProductsRoutes,
  categoriesRoutes,
  productsRoutes,
} from "./modules/products/routes.js";
import { authRoutes, userRoutes } from "./modules/users/routes.js";
import { cartRoutes, orderRoutes, paymentRoutes } from "./modules/checkout/routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevelopmentOrigin =
        env.NODE_ENV !== "production" &&
        /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin ?? "");

      callback(
        null,
        !origin || origin === env.FRONTEND_URL || isLocalDevelopmentOrigin,
      );
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "multi-team-ecommerce-api",
    supabaseConfigured: supabase !== null,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/admin/categories", adminCategoriesRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }
  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image files must be 5 MB or smaller."
        : "The uploaded file could not be accepted.";
    response.status(400).json({ error: message });
    return;
  }
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    response.status(400).json({ error: "Request body must contain valid JSON." });
    return;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    response.status(413).json({ error: "Request body is too large." });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "An unexpected server error occurred." });
};

app.use(errorHandler);
