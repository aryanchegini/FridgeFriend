const dotenv = require('dotenv').config();
const mongoose = require('mongoose')
const app = require('./app');
const logger = require('./utils/logger');
const connectDB = require('./config/mongoose.config');
const redisClient = require('./config/redis.config');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start application server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start the Express server
    app.listen(PORT, HOST, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT} with host ${HOST}`);
    });
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
}

startServer();

/**
 * Handle application shutdown
 * @param {String} signal - Signal received
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server and connections`);
  
  try {
    // Close Redis connection
    await redisClient.quit();
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
    logger.info('Server and connections closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during graceful shutdown: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));