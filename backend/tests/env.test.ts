import { describe, expect, it } from "vitest";
import { envSchema } from "../src/config/env.js";

describe("environment configuration", () => {
  it("allows blank Supabase values for local startup without database credentials", () => {
    const parsed = envSchema.parse({
      PORT: "4000",
      NODE_ENV: "test",
      FRONTEND_URL: "http://localhost:5173",
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: "",
    });

    expect(parsed.SUPABASE_URL).toBeUndefined();
    expect(parsed.SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
  });

  it("requires the Supabase URL and publishable key together", () => {
    expect(() =>
      envSchema.parse({
        PORT: "4000",
        NODE_ENV: "test",
        FRONTEND_URL: "http://localhost:5173",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toThrow();
  });
});
