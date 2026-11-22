import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { vercelHandler } from "../src/vercel-handler.js";

vi.mock("../src/modules/products/service.js", () => ({
  getProductBySlug: vi.fn(),
  listActiveProducts: vi.fn().mockResolvedValue({ data: [], error: null }),
  listAdminProducts: vi.fn(),
  listTrendingProducts: vi.fn(),
  uploadProductImage: vi.fn(),
}));

const requestWithVercelMetadata: RequestHandler = (request, response) => {
  Object.defineProperty(request, "query", {
    configurable: true,
    value: { "...route": "products" },
  });
  vercelHandler(request, response);
};

describe("Vercel API handler", () => {
  it("forwards nested API paths to Express", async () => {
    const response = await request(vercelHandler).get(
      "/?__vercel_path=auth/me",
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Authentication is required.",
    });
  });

  it("removes Vercel route metadata before strict query validation", async () => {
    const response = await request(requestWithVercelMetadata).get(
      "/?__vercel_path=products&path=products&sort=newest&page=1&pageSize=4",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
