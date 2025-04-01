const mongoose = require("mongoose");
const request = require("supertest");
const Product = require("../../src/models/product.model");
const UserInventory = require("../../src/models/userInventory.model");
require("dotenv").config();

const app = require("../../src/app");

// Mock the product service
jest.mock("../../src/services/product.service", () => {
  const originalModule = jest.requireActual('../../src/services/product.service');
  return {
    ...originalModule,
    // We can override specific functions if needed
  };
});

let token;
let userId;
let productId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  // Register test user
  await request(app).post("/auth/register").send({
    name: "testuserproduct",
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  // Login to get token and user ID
  const loginResponse = await request(app).post("/auth/login").send({
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  token = loginResponse.body.token;
  userId = loginResponse.body.user.id;

  // Create user inventory 
  await request(app)
    .post("/groups/create-inventory")
    .set("Authorization", `Bearer ${token}`);
});

afterEach(async () => {
  // Clean up collections
  await Product.deleteMany({});
  
  // Re-create test user and get new token
  const loginResponse = await request(app).post("/auth/login").send({
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  if (!loginResponse.body.token) {
    // User was deleted, recreate
    await request(app).post("/auth/register").send({
      name: "testuserproduct",
      email: "testuserproduct@example.com",
      password: "testuserproduct123",
    });

    const newLoginResponse = await request(app).post("/auth/login").send({
      email: "testuserproduct@example.com",
      password: "testuserproduct123",
    });

    token = newLoginResponse.body.token;
    userId = newLoginResponse.body.user.id;
  } else {
    token = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  }

  // Ensure inventory exists
  await request(app)
    .post("/groups/create-inventory")
    .set("Authorization", `Bearer ${token}`);
});

afterAll(async () => {
  await mongoose.connection.close();
});


// ======================
// Testing products
// ======================
describe("Product Controller", () => {
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
      
      // Verify product was actually created in DB
      const product = await Product.findById(productId);
      expect(product).toBeTruthy();
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
      // Create a product first
      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Test Product",
          quantity: 1,
          dateOfExpiry: "2025-04-01",
        });
        
      const res = await request(app)
        .get("/products")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("PATCH /products/:productId", () => {
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
      
      // Verify the status was actually updated in the database
      const product = await Product.findById(localProductId);
      expect(product.status).toBe("consumed");
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
      
      // Verify product was actually deleted
      const product = await Product.findById(deleteProductId);
      expect(product).toBeNull();
    });

    it("should fail if product doesn't exist", async () => {
      // Delete once
      await request(app)
        .delete(`/products/${deleteProductId}`)
        .set("Authorization", `Bearer ${token}`);

      // Try to delete again - should fail
      const res = await request(app)
        .delete(`/products/${deleteProductId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });
  });
});