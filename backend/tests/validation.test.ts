import { describe, expect, it } from "vitest";
import { addressSchema } from "../src/modules/users/validation.js";
import {
  productCreateSchema,
  productListQuerySchema,
  categoryCreateSchema,
} from "../src/modules/products/validation.js";
import {
  cartItemSchema,
  checkoutSchema,
  paymentRetrySchema,
} from "../src/modules/checkout/validation.js";

describe("user and product validation", () => {
  it("accepts category image URLs and an empty image value", () => {
    const withImage = categoryCreateSchema.safeParse({
      name: "Home & Living",
      slug: "home-living",
      imageUrl: "https://images.example.com/home.jpg",
    });
    const withoutImage = categoryCreateSchema.safeParse({
      name: "Technology",
      slug: "technology",
      imageUrl: "",
    });

    expect(withImage.success).toBe(true);
    expect(withoutImage.success).toBe(true);
    if (withImage.success) expect(withImage.data.imageUrl).toBe("https://images.example.com/home.jpg");
    if (withoutImage.success) expect(withoutImage.data.imageUrl).toBeNull();
  });

  it("accepts zero price and stock and applies safe product defaults", () => {
    const result = productCreateSchema.safeParse({
      sku: "SAMPLE-001",
      name: "Sample product",
      price: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        currency: "INR",
        isActive: true,
        quantity: 0,
      });
    }
  });

  it("rejects negative prices and stock counts", () => {
    const negativePrice = productCreateSchema.safeParse({
      sku: "SAMPLE-001",
      name: "Sample product",
      price: -0.01,
    });
    const negativeStock = productCreateSchema.safeParse({
      sku: "SAMPLE-001",
      name: "Sample product",
      price: 10,
      quantity: -1,
    });

    expect(negativePrice.success).toBe(false);
    expect(negativeStock.success).toBe(false);
  });

  it("rejects pagination outside the supported range and inverted price filters", () => {
    expect(productListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(
      productListQuerySchema.safeParse({ minPrice: "100", maxPrice: "10" }).success,
    ).toBe(false);
    expect(productListQuerySchema.safeParse({ pageSize: "51" }).success).toBe(false);
  });

  it("normalizes the country code in a valid address", () => {
    const result = addressSchema.safeParse({
      label: "Home",
      recipientName: "Sample Customer",
      addressLine1: "12 Example Road",
      city: "Pune",
      region: "Maharashtra",
      postalCode: "411001",
      country: "in",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.country).toBe("IN");
  });

  it("rejects addresses with missing required location fields", () => {
    const result = addressSchema.safeParse({
      label: "Home",
      recipientName: "Sample Customer",
      addressLine1: "12 Example Road",
      city: "",
      region: "Maharashtra",
      postalCode: "411001",
    });

    expect(result.success).toBe(false);
  });

  it("enforces cart quantity boundaries", () => {
    const productId = "a516c19d-944a-4be3-8db6-2a7f43339cb3";
    expect(cartItemSchema.safeParse({ productId, quantity: 1 }).success).toBe(true);
    expect(cartItemSchema.safeParse({ productId, quantity: 99 }).success).toBe(true);
    expect(cartItemSchema.safeParse({ productId, quantity: 0 }).success).toBe(false);
    expect(cartItemSchema.safeParse({ productId, quantity: 100 }).success).toBe(false);
  });

  it("requires a real address, an explicit payment simulation, and an idempotency key", () => {
    const validCheckout = {
      addressId: "c50933da-0a6e-4439-8ed4-038ba11ef57e",
      paymentMethod: "simulated_upi",
      simulatedResult: "success",
      idempotencyKey: "checkout-attempt-1",
    };

    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...validCheckout, addressId: "not-an-id" }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...validCheckout, simulatedResult: "charged" }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...validCheckout, idempotencyKey: "short" }).success,
    ).toBe(false);
  });

  it("accepts only explicit simulated payment retry outcomes", () => {
    const paymentRetry = {
      orderId: "c50933da-0a6e-4439-8ed4-038ba11ef57e",
      simulatedResult: "failed",
      idempotencyKey: "retry-attempt-1",
    };

    expect(paymentRetrySchema.safeParse(paymentRetry).success).toBe(true);
    expect(
      paymentRetrySchema.safeParse({ ...paymentRetry, simulatedResult: "pending" }).success,
    ).toBe(false);
  });
});
