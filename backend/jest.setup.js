// jest.setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const redis = require('redis-mock'); // Use redis-mock for testing

let mongoServer;

// Setup function before all tests
beforeAll(async () => {
  // Use MongoDB Memory Server instead of actual database for testing
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Set environment variables for tests
  process.env.MONGODB_TEST_URI = uri;
  process.env.JWT_SECRET = 'test-secret-key';
  
  // Mock Redis
  jest.mock('redis', () => redis);
  
  // Connect to in-memory database
  await mongoose.connect(uri);
  
  console.log('Connected to the in-memory test database');
});

// Clean database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Close database connection
afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('Disconnected from test database');
});