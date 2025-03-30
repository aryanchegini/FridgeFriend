const request = require("supertest");
const mongoose = require("mongoose");
const Group = require("../../src/models/group.model");
const GroupMembership = require("../../src/models/groupMembership.model");
const authenticate = require("../../src/middleware/auth.middleware");
const UserInventory = require("../../src/models/userInventory.model");
const User = require("../../src/models/user.model");

require("dotenv").config({ path: ".env.test" });

const app = require("../../src/app");
const mockUserId = "65f2a5e9d3b6b6a9f4b2c123"; // use string in mock

jest.mock("../../src/middleware/auth.middleware", () => {
  return (req, res, next) => {
    req.user = {
      _id: mockUserId,
      name: "Test User",
      email: "test@example.com",
    };
    next();
  };
});

const userId = new mongoose.Types.ObjectId(mockUserId); // use ObjectId where needed

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  // Fake auth middleware for testing
  app.use((req, res, next) => {
    req.user = { _id: userId };
    next();
  });
});

afterEach(async () => {
  await Group.deleteMany();
  await GroupMembership.deleteMany();
  await User.deleteMany();
  await UserInventory.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase(); // optional: cleans test DB
  await mongoose.connection.close();
  await new Promise((resolve) => setTimeout(resolve, 100)); // give time to cleanup
});

// Testing Creating Groups

describe("POST /groups", () => {
  it("should create a new group and membership", async () => {
    const res = await request(app)
      .post("/groups") //
      .send({ group_name: "Test Group" });

    expect(res.statusCode).toBe(201);
    expect(res.body.group).toHaveProperty("groupName", "Test Group");
    expect(res.body.group).toHaveProperty("groupCode");
    expect(res.body.group).toHaveProperty("createdBy");

    const groupInDb = await Group.findOne({ groupName: "Test Group" });
    expect(groupInDb).not.toBeNull();

    const membership = await GroupMembership.findOne({
      userId: "65f2a5e9d3b6b6a9f4b2c123",
      groupId: groupInDb._id,
    });
    expect(membership).not.toBeNull();
  });

  it("should return 400 if group name is missing", async () => {
    const res = await request(app).post("/groups").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Group name is required");
  });
});

// Testing Leaderboard Returns
describe("GET /groups", () => {
  it("should return groups the user is a member of with leaderboard", async () => {
    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "fakepassword",
    });

    const group = await Group.create({
      groupName: "Leaderboard Group",
      groupCode: "ABC123",
      createdBy: userId,
    });

    await GroupMembership.create({
      userId,
      groupId: group._id,
    });

    await UserInventory.create({
      userId,
      products: [],
      score: 80,
    });

    const res = await request(app)
      .get("/groups")
      .set("Authorization", "Bearer fakeToken");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const returnedGroup = res.body[0];
    expect(returnedGroup.groupName).toBe("Leaderboard Group");
    expect(returnedGroup.leaderboard[0]).toMatchObject({
      userID: userId.toString(),
      score: 80,
      userName: "Test User",
    });
  });
});

// Testing Joining Groups Using a Code
describe("POST /groups/join", () => {
  it("should allow user to join group by code", async () => {
    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "fakepassword",
    });

    const group = await Group.create({
      groupName: "Joinable Group",
      groupCode: "JOIN01",
      createdBy: userId,
    });

    const res = await request(app)
      .post("/groups/join")
      .send({ group_code: "JOIN01" })
      .set("Authorization", "Bearer fakeToken");

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User successfully joined the group");

    const membership = await GroupMembership.findOne({
      userId,
      groupId: group._id,
    });

    expect(membership).not.toBeNull();
  });

  it("should return 404 if group code is invalid", async () => {
    const res = await request(app)
      .post("/groups/join")
      .send({ group_code: "FAKE123" })
      .set("Authorization", "Bearer fakeToken");

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Group not found");
  });

  it("should return 400 if user is already in the group", async () => {
    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "fakepassword",
    });

    const group = await Group.create({
      groupName: "Existing Member Group",
      groupCode: "ALREADY1",
      createdBy: userId,
    });

    await GroupMembership.create({
      userId,
      groupId: group._id,
    });

    const res = await request(app)
      .post("/groups/join")
      .send({ group_code: "ALREADY1" })
      .set("Authorization", "Bearer fakeToken");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("User is already in this group");
  });

  it("should return 400 if no group code is provided", async () => {
    const res = await request(app)
      .post("/groups/join")
      .send({})
      .set("Authorization", "Bearer fakeToken");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Group code is required");
  });
});
