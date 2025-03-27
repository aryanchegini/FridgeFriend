// __tests__/routes/barcodes.routes.test.js
const request = require("supertest");
const app = require("../../src/app");
const axios = require("axios");

// Mock axios and redis
jest.mock("axios");
jest.mock("redis", () => {
  return {
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      get: jest.fn().mockImplementation((key) => {
        if (key === "3017620422003") {
          return Promise.resolve("Nutella");
        }
        return Promise.resolve(null);
      }),
      setEx: jest.fn().mockResolvedValue(true),
    }),
  };
});

let token;
const validBarcode = "3017620422003"; // nutella barcode
const invalidBarcode = "3017620422004";

describe("Barcode Controller", () => {
  beforeEach(async () => {
    // Mock the axios response for OpenFoodFacts API
    axios.get.mockImplementation((url) => {
      if (url.includes(validBarcode)) {
        return Promise.resolve({
          data: {
            product: {
              product_name: "Nutella",
              brands: "Ferrero",
            },
          },
        });
      } else {
        return Promise.reject({
          response: { status: 404 },
        });
      }
    });

    // Register a test user
    const registerResponse = await request(app).post("/auth/register").send({
      name: "testuserbarcode",
      email: "testuserbarcode@example.com",
      password: "testuserbarcode123",
    });

    token = registerResponse.body.token;
  });

  it("should fetch product from external API if not cached", async () => {
    const res = await request(app)
      .get(`/barcodes/${validBarcode}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("product_name");
    expect(res.body).toHaveProperty("source", "external-api");
  });

  it("should return 404 for non-existent barcode", async () => {
    const res = await request(app)
      .get(`/barcodes/${invalidBarcode}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("success", false);
  });

  it("should fetch from Redis cache if previously queried", async () => {
    // First call to populate cache (handled by our mocks)
    await request(app)
      .get(`/barcodes/${validBarcode}`)
      .set("Authorization", `Bearer ${token}`);

    // Second call should hit Redis (also handled by our mocks)
    const res = await request(app)
      .get(`/barcodes/${validBarcode}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("source", "redis-cache");
  });
});