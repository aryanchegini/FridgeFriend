const mongoose = require("mongoose");
const request = require("supertest");
require("dotenv").config();

const app = require("../../src/app");

let token;
let userId;
let productId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  await request(app).post("/auth/register").send({
    name: "testuserproduct",
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  token = loginResponse.body.token;
  userId = loginResponse.body.user._id;

  await request(app)
    .post("/groups/create-inventory")
    .set("Authorization", `Bearer ${token}`);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany();
  }

  // Re-create token + inventory after clearing data
  await request(app).post("/auth/register").send({
    name: "testuserproduct",
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email: "testuserproduct@example.com",
    password: "testuserproduct123",
  });

  token = loginResponse.body.token;

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

    it("should fail if product doesn’t exist", async () => {
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
