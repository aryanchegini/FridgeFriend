const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const UserInventory = require("../../src/models/userInventory.model");
require("dotenv").config();

// Mock the auth service to ensure consistent behavior
jest.mock('../../src/services/auth.service', () => {
  const originalModule = jest.requireActual('../../src/services/auth.service');
  
  return {
    ...originalModule,
    // These functions will use the actual implementation,
    // but we can control responses if needed
  };
});

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany(); // only clear data, not drop DB
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth Controller", () => {
  describe("POST /auth/register", () => {
    // register
    // 201 since user is being created
    it("should return 201 OK with valid credentials", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "testuserregister",
        email: "testuserregister@example.com",
        password: "testuserregister123",
      });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("token");
      
      // Verify that user was actually created in database
      const user = await User.findOne({ email: "testuserregister@example.com" });
      expect(user).toBeTruthy();
      
      // Verify inventory was created
      const inventory = await UserInventory.findOne({ userId: user._id });
      expect(inventory).toBeTruthy();
    });
    
    it("should return 400 if user already exists", async () => {
      // Create user first
      await request(app).post("/auth/register").send({
        name: "existinguser",
        email: "existinguser@example.com",
        password: "existinguser123",
      });
      
      // Try to register again with same email
      const response = await request(app).post("/auth/register").send({
        name: "existinguser2",
        email: "existinguser@example.com", 
        password: "existinguser456",
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain("already exists");
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/auth/register").send({
        name: "testuserlogin",
        email: "testuserlogin@example.com",
        password: "passwordlogin123",
      });
    });

    // Logging in with correct credentials
    it("should return 200 OK with valid credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "testuserlogin@example.com",
        password: "passwordlogin123",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("token");
    });

    // Wrong Log in (invalid credentials, login details non-existant)
    it("should return 401 Unauthorized with invalid credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "wronguser@example.com",
        password: "wrongpassword",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});