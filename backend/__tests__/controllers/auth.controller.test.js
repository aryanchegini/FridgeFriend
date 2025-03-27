// __tests__/controllers/auth.controller.test.js
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/models/user.model");
const UserInventory = require("../../src/models/userInventory.model");

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
      
      // Verify user inventory was created
      const user = await User.findOne({ email: "testuserregister@example.com" });
      const inventory = await UserInventory.findOne({ userId: user._id });
      expect(inventory).toBeTruthy();
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