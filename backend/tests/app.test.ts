import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("API foundation", () => {
  it("reports API and Supabase setup status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "multi-team-ecommerce-api",
    });
    expect(typeof response.body.supabaseConfigured).toBe("boolean");
  });

  it("allows the Vite fallback port during local development", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5174");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5174",
    );
  });

  it("returns a clear error for unknown routes", async () => {
    const response = await request(app).get("/api/not-a-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Route not found." });
  });

  it("requires authentication for profile and address records", async () => {
    const profileResponse = await request(app).get("/api/auth/me");
    const addressResponse = await request(app).get("/api/users/addresses");

    expect(profileResponse.status).toBe(401);
    expect(profileResponse.body).toEqual({ error: "Authentication is required." });
    expect(addressResponse.status).toBe(401);
  });

  it("requires authentication for cart, order, and payment operations", async () => {
    const cartResponse = await request(app).get("/api/cart");
    const ordersResponse = await request(app).get("/api/orders");
    const paymentResponse = await request(app).post("/api/payments/simulate").send({});
    const wishlistResponse = await request(app).get("/api/wishlist");

    expect(cartResponse.status).toBe(401);
    expect(ordersResponse.status).toBe(401);
    expect(paymentResponse.status).toBe(401);
    expect(wishlistResponse.status).toBe(401);
  });

  it("rejects unauthenticated product-management requests", async () => {
    const response = await request(app).post("/api/admin/products").send({
      name: "Unauthorized product",
    });

    expect(response.status).toBe(401);
  });

  it("requires authentication for admin analytics", async () => {
    const response = await request(app).get("/api/admin/analytics");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication is required." });
    expect(response.body).toEqual({ error: "Authentication is required." });
  });

  it("rejects invalid pagination and price-range filters before database access", async () => {
    const invalidPage = await request(app).get("/api/products?page=0");
    const invalidRange = await request(app).get(
      "/api/products?minPrice=50&maxPrice=10",
    );

    expect(invalidPage.status).toBe(400);
    expect(invalidPage.body.error).toBe("Invalid request data.");
    expect(invalidRange.status).toBe(400);
    expect(invalidRange.body.error).toBe("Invalid request data.");
  });
});
