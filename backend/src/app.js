const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const helmet = require("helmet");
const morgan = require("morgan");


const logger = require("./utils/logger.js")
const errorHandler = require("./middleware/error.middleware.js");
const { setupNotificationScheduler } = require('./controllers/notification.controller');
const { setupScheduledTasks } = require('./controllers/product.controller');

const app = express();
setupNotificationScheduler();
setupScheduledTasks();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(cors());

// Postman testing
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Detailed request logging
app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`);
  logger.debug(`Request Headers: ${JSON.stringify(req.headers)}`);
  logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

app.use("/products", require("./routes/products.routes.js"));
app.use("/groups", require("./routes/groups.routes.js"));
app.use("/auth", require("./routes/auth.routes.js"));
app.use("/barcodes", require("./routes/barcodes.routes"))
app.use("/notifications", require("./routes/notifications.routes.js"));

app.use(errorHandler);

module.exports = app;
