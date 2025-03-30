const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/user.model');
const authenticate = require('../../src/middleware/auth.middleware');
require("dotenv").config();

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Connect to the test database before running tests
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI, mongoOptions);
  console.log('Connected to test database');
});

// Clear the test database after all tests
afterAll(async () => {
  // Delete all users created during testing
  await User.deleteMany({});
  
  // Close the MongoDB connection
  await mongoose.connection.close();
  console.log('Disconnected from test database');
});

// Reset mocks and database before each test
beforeEach(async () => {
  jest.clearAllMocks();
  // Clear any test users before each test to ensure clean state
  await User.deleteMany({});
});

describe('Authentication Middleware', () => {
  let req, res, next;
  let testUser;

  beforeEach(() => {
    // Setup request, response and next function
    req = {
      headers: {
        authorization: 'Bearer test_token'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });

  // Create a test user for tests that need one
  const createTestUser = async () => {
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword123'
    });
    return testUser;
  };

  test('should return 401 when no authorization header is provided', async () => {
    // Setup request without authorization header
    req.headers.authorization = undefined;
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when authorization header format is invalid', async () => {
    // Setup request with invalid authorization header
    req.headers.authorization = 'InvalidFormat';
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when token is invalid', async () => {
    // Simulate JWT verification failure
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 404 when user not found', async () => {
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'nonexistent_user_id' });
    
    
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next() and attach user to request when token is valid', async () => {
    // Create a test user in the database
    const user = await createTestUser();
    const userId = user._id.toString();
    
    // Simulate JWT verification success with valid user ID
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: userId });
    
    // Mock the User.findById to return the user without actually hitting the database
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: user._id,
        name: 'Test User',
        email: 'test@example.com'
        // No password field, as it would be excluded by select("-password")
      })
    });
    
    await authenticate(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user._id.toString()).toBe(userId);
    expect(req.user.name).toBe('Test User');
    expect(req.user.email).toBe('test@example.com');
    expect(req.user.password).toBeUndefined();
  });

  test('should handle database errors gracefully', async () => {
    // Create a test user
    const user = await createTestUser();
    
    // Simulate JWT verification success
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: user._id.toString() });
    
    // Simulate database error
    jest.spyOn(User, 'findById').mockImplementation(() => {
      throw new Error('Database error');
    });
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});