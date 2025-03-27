// jest.config.js
module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./jest.setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    verbose: true,
    forceExit: true, // Force Jest to exit after all tests complete
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    testTimeout: 30000, // Increase timeout for tests
    detectOpenHandles: true // Help identify why Jest doesn't exit
  };