import { Router } from "express";
import multer from "multer";
import { ApiError } from "../../lib/api-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getProduct,
  listAdminCategories,
  listAdminProductsController,
  listCategories,
  listProducts,
  listTrending,
  updateCategory,
  updateInventory,
  updateProduct,
  uploadImage,
} from "./controller.js";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new ApiError(400, "Upload a JPEG, PNG, or WebP image."));
      return;
    }
    callback(null, true);
  },
});

export const productsRoutes = Router();
productsRoutes.get("/", listProducts);
productsRoutes.get("/trending", listTrending);
productsRoutes.get("/:slug", getProduct);

export const adminProductsRoutes = Router();
adminProductsRoutes.use(authenticate, requireAdmin);
adminProductsRoutes.get("/", listAdminProductsController);
adminProductsRoutes.post("/", createProduct);
adminProductsRoutes.put("/:id", updateProduct);
adminProductsRoutes.delete("/:id", deleteProduct);
adminProductsRoutes.patch("/:id/inventory", updateInventory);
adminProductsRoutes.post("/:id/image", imageUpload.single("image"), uploadImage);

export const categoriesRoutes = Router();
categoriesRoutes.get("/", listCategories);

export const adminCategoriesRoutes = Router();
adminCategoriesRoutes.use(authenticate, requireAdmin);
adminCategoriesRoutes.get("/", listAdminCategories);
adminCategoriesRoutes.post("/", createCategory);
adminCategoriesRoutes.put("/:id", updateCategory);
adminCategoriesRoutes.delete("/:id", deleteCategory);
