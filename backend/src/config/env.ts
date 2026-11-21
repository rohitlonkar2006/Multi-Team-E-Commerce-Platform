import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envFile = process.cwd().endsWith(path.sep + "backend")
  ? path.resolve(process.cwd(), ".env")
  : path.resolve(process.cwd(), "backend", ".env");

dotenv.config({ path: envFile });

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    SUPABASE_URL: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().url().optional(),
    ),
    SUPABASE_PUBLISHABLE_KEY: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
    SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
  })
  .superRefine((env, context) => {
    if (Boolean(env.SUPABASE_URL) !== Boolean(env.SUPABASE_PUBLISHABLE_KEY)) {
      context.addIssue({
        code: "custom",
        message:
          "Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, or leave both unset.",
        path: ["SUPABASE_URL"],
      });
    }
  });

export const env = envSchema.parse(process.env);
