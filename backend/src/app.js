const express = require("express");
const router = express.Router();
const cors = require("cors");
const dotenv = require("dotenv").config();
const helmet = require("helmet");
const morgan = require("morgan");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/error.middleware");
const { initScheduledJobs } = require('./jobs/cron');
const redisClient = require('./config/redis.config');

// Initialize Express app
const app = express();

// Connect to Redis
redisClient.connectRedis();

// Initialize scheduled jobs
initScheduledJobs();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(cors());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Detailed request logging
app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`);
  logger.debug(`Request Headers: ${JSON.stringify(req.headers)}`);
  logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

// Routes
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/products.routes");
const groupRoutes = require("./routes/groups.routes");
const barcodeRoutes = require("./routes/barcodes.routes");
const notificationRoutes = require("./routes/notifications.routes");

// Define router paths
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/groups", groupRoutes);
app.use("/barcodes", barcodeRoutes);
app.use("/notifications", notificationRoutes);

// Postman testing route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Error handler
app.use(errorHandler);

module.exports = app;