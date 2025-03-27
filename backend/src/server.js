const dotenv = require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const cors = require("cors");
const connectDB = require("./config/mongoose.config.js");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Start the server
    app.listen(PORT, HOST, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT} with host ${HOST}`);
    });
    connectDB();  
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
}


startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});
