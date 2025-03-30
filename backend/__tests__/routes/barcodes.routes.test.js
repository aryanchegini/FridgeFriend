const mongoose = require("mongoose");
const request = require("supertest")
const app = require('../../src/app')
const connectDB = require('../../src/config/mongoose.config')
require("dotenv").config();
const redis = require("redis");


// TODO: Tests for external API


let token;
let redisClient;


const validBarcode = '3017620422003'; // nutella barcode
const invalidBarcode = '3017620422004';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI);

    // Connect to Redis
    redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
    });
    await redisClient.connect();

    // Register and login
    await request(app).post("/auth/register").send({
        name: "testuserbarcode",
        email: "testuserbarcode@example.com",
        password: "testuserbarcode123",
    });

    const loginRes = await request(app).post("/auth/login").send({
        email: "testuserbarcode@example.com",
        password: "testuserbarcode123",
    });

    token = loginRes.body.token;
});

afterEach(async () => {
    // Clear Redis entry for validBarcode to simulate cache miss
    await redisClient.del(validBarcode);

    // Clear all collections
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
        await collection.deleteMany();
    }

    // Re-create test user
    await request(app).post("/auth/register").send({
        name: "testuserbarcode",
        email: "testuserbarcode@example.com",
        password: "testuserbarcode123",
    });

    const loginRes = await request(app).post("/auth/login").send({
        email: "testuserbarcode@example.com",
        password: "testuserbarcode123",
    });

    token = loginRes.body.token;
});

afterAll(async () => {
    await redisClient.quit();
    await mongoose.connection.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
});

describe("Barcode Controller", () => {
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
        // First call hits API and caches it
        await request(app)
            .get(`/barcodes/${validBarcode}`)
            .set("Authorization", `Bearer ${token}`);

        // Second call should hit Redis
        const res = await request(app)
            .get(`/barcodes/${validBarcode}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("source", "redis-cache");
    });
});