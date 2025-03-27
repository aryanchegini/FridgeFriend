// __tests__/controllers/product.controller.test.js
const mongoose = require("mongoose");
const request = require("supertest");
require("dotenv").config();

const app = require("../../src/app");
const Product = require("../../src/models/product.model");
const UserInventory = require("../../src/models/userInventory.model");

let token;
let userId;
let productId;

describe("Product Controller", () => {
  beforeEach(async () => {
    // Register test user
    const registerResponse = await request(app).post("/auth/register").send({
      name: "testuserproduct",
      email: "testuserproduct@example.com",
      password: "testuserproduct123",
    });

    // Extract token and user info
    token = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Ensure user inventory exists
    const inventory = await UserInventory.findOne({ userId });
    if (!inventory) {
      await UserInventory.create({
        userId,
        products: [],
        score: 0,
      });
    }
  });

  afterEach(async () => {
    // Clean up products
    await Product.deleteMany({});
  });

  // ======================
  // Testing products
  // ======================
  describe("POST /products", () => {
    it("should create a product successfully", async () => {
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Milk",
          quantity: 2,
          dateOfExpiry: "2025-04-01",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("productName", "Milk");
      productId = res.body._id;
    });

    it("should fail to create with missing fields", async () => {
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          quantity: 1,
          dateOfExpiry: "2025-04-01",
        });

      expect(res.statusCode).toBe(400);
    });

    it("should fail with invalid status", async () => {
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Cheese",
          quantity: 1,
          dateOfExpiry: "2025-04-01",
          status: "badstatus",
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /products", () => {
    it("should return all user products", async () => {
      const res = await request(app)
        .get("/products")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PATCH /products/:productId/status", () => {
    let localProductId;

    beforeEach(async () => {
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Eggs",
          quantity: 1,
          dateOfExpiry: "2025-05-01",
        });

      localProductId = res.body._id;
    });

    it("should update product status to consumed", async () => {
      const res = await request(app)
        .patch(`/products/${localProductId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "consumed" });

      expect(res.statusCode).toBe(200);
      expect(res.body.updatedProduct.status).toBe("consumed");
    });

    it("should fail with invalid status", async () => {
      const res = await request(app)
        .patch(`/products/${localProductId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "invalid_status" });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /products/:productId", () => {
    let deleteProductId;

    beforeEach(async () => {
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Juice",
          quantity: 1,
          dateOfExpiry: "2025-06-01",
        });

      deleteProductId = res.body._id;
    });

    it("should delete a product", async () => {
      const res = await request(app)
        .delete(`/products/${deleteProductId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/Deleted/i);
    });

    it("should fail if product doesn't exist", async () => {
      await request(app)
        .delete(`/products/${deleteProductId}`)
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app)
        .delete(`/products/${deleteProductId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });
  });
});