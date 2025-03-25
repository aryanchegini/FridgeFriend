const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const connectDB = require("../../src/config/mongoose.config");

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
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
    });
  });

  describe("POST /auth/login", () => {
    beforeAll(async () => {
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
