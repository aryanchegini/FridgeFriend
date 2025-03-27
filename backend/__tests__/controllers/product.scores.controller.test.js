const mongoose = require("mongoose");
const request = require("supertest");
require("dotenv").config({ path: ".env.test" }); // Use test DB

const app = require("../../src/app");
const Product = require("../../src/models/product.model");
const UserInventory = require("../../src/models/userInventory.model");

let token;
let userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  // Register test user
  await request(app).post("/auth/register").send({
    name: "testuserscore",
    email: "testuserscore@example.com",
    password: "testuserscore123",
  });

  // Login to get token and user ID
  const loginResponse = await request(app).post("/auth/login").send({
    email: "testuserscore@example.com",
    password: "testuserscore123",
  });

  // Extract token and user info
  token = loginResponse.body.token;
  userId = loginResponse.body.user.id;

  // Ensure we have a user inventory
  const existingInventory = await UserInventory.findOne({ userId });
  if (!existingInventory) {
    await UserInventory.create({
      userId,
      products: [],
      score: 0,
    });
  }
});

afterEach(async () => {
  // Clean up products and reset inventory score
  await Product.deleteMany({});
  await UserInventory.findOneAndUpdate({ userId }, { score: 0 }, { new: true });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Product Scoring System", () => {
  describe("Initial scoring on product creation", () => {
    it("should add correct points for a product expiring in 1 day", async () => {
      // Create a date object for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Milk",
          quantity: 1,
          dateOfExpiry: tomorrow.toISOString().split("T")[0],
        });

      // Check the inventory score (should be 1 point for 1 day remaining)
      const inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(1);
    });

    it("should add correct points for a product expiring in 10+ days", async () => {
      // Create a date object for 15 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Canned Beans",
          quantity: 1,
          dateOfExpiry: futureDate.toISOString().split("T")[0],
        });

      // Check the inventory score (should be capped at 10 points)
      const inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(10);
    });

    it("should add correct points for a product expiring in 5 days", async () => {
      // Create a date object for 5 days from now
      const fiveDaysLater = new Date();
      fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Yogurt",
          quantity: 1,
          dateOfExpiry: fiveDaysLater.toISOString().split("T")[0],
        });

      // Check the inventory score (should be 5 points for 5 days remaining)
      const inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(5);
    });

    it("should subtract points for a product that is already expired", async () => {
      // Create a date object for yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Old Bread",
          quantity: 1,
          dateOfExpiry: yesterday.toISOString().split("T")[0],
          status: "expired",
        });

      // Check the inventory score (should be -10 points for expired product)
      const inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(-10);
    });
  });

  describe("Score adjustment when product status changes", () => {
    it("should add bonus points when a product is marked as consumed before expiry", async () => {
      // First, create a product expiring in 3 days
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const createRes = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Fresh Salad",
          quantity: 1,
          dateOfExpiry: threeDaysLater.toISOString().split("T")[0],
        });

      const productId = createRes.body._id;

      // Check initial score (should be 3 points)
      let inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(3);

      // Now mark as consumed
      await request(app)
        .patch(`/products/${productId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "consumed" });

      // Check updated score (should be 3 + 5 bonus points = 8)
      inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(8);
    });

    it("should not add bonus points when an expired product is marked as consumed", async () => {
      // First, create a product that's already expired
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const createRes = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Old Milk",
          quantity: 1,
          dateOfExpiry: yesterday.toISOString().split("T")[0],
          status: "expired",
        });

      const productId = createRes.body._id;

      // Check initial score (should be -10 points)
      let inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(-10);

      // Now mark as consumed
      await request(app)
        .patch(`/products/${productId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "consumed" });

      // Check updated score (should still be -10, no bonus)
      inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(-10);
    });
  });

  describe("Score adjustment when product is deleted", () => {
    it("should subtract points when a product is deleted", async () => {
      // Create a product with 7 days until expiry
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const createRes = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Chicken",
          quantity: 1,
          dateOfExpiry: sevenDaysLater.toISOString().split("T")[0],
        });

      const productId = createRes.body._id;

      // Check initial score (should be 7 points)
      let inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(7);

      // Now delete the product
      await request(app)
        .delete(`/products/${productId}`)
        .set("Authorization", `Bearer ${token}`);

      // Check updated score (should be 0 after product is deleted)
      inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(0);
    });

    it("should subtract consumption bonus when a consumed product is deleted", async () => {
      // First, create a product expiring in 3 days
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const createRes = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Fresh Fruit",
          quantity: 1,
          dateOfExpiry: threeDaysLater.toISOString().split("T")[0],
        });

      const productId = createRes.body._id;

      // Mark as consumed
      await request(app)
        .patch(`/products/${productId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "consumed" });

      // Check score after consumption (should be 3 + 5 bonus points = 8)
      let inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(8);

      // Now delete the product
      await request(app)
        .delete(`/products/${productId}`)
        .set("Authorization", `Bearer ${token}`);

      // Check updated score (should be 0 after product is deleted)
      inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(0);
    });

    it("should not change score when deleting an expired product", async () => {
      // Create an expired product
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const createRes = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Old Yogurt",
          quantity: 1,
          dateOfExpiry: yesterday.toISOString().split("T")[0],
          status: "expired",
        });

      const productId = createRes.body._id;

      // Check initial score (should be -10 points)
      let inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(-10);

      // Now delete the product
      await request(app)
        .delete(`/products/${productId}`)
        .set("Authorization", `Bearer ${token}`);

      // Check updated score (should be -10 after product is deleted)
      inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(-10);
    });
  });

  describe("Multiple products scoring", () => {
    it("should correctly calculate score with multiple products", async () => {
      // Create dates for different expiry times
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const fiveDaysLater = new Date();
      fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

      const tenDaysLater = new Date();
      tenDaysLater.setDate(tenDaysLater.getDate() + 10);

      // Create 3 products with different expiry dates
      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Milk",
          quantity: 1,
          dateOfExpiry: tomorrow.toISOString().split("T")[0],
        });

      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Bread",
          quantity: 1,
          dateOfExpiry: fiveDaysLater.toISOString().split("T")[0],
        });

      await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "Canned Beans",
          quantity: 1,
          dateOfExpiry: tenDaysLater.toISOString().split("T")[0],
        });

      // Check total score (should be 1 + 5 + 10 = 16)
      const inventory = await UserInventory.findOne({ userId });
      expect(inventory.score).toBe(16);
    });
  });
});
