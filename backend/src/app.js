const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/mongoose.config.js");

const errorHandler = require("./middleware/error.middleware.js");

const app = express();
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(cors());

// Postman testing
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.use("/products", require("./routes/products.routes.js"));
app.use("/groups", require("./routes/groups.routes.js"));
app.use("/auth", require("./routes/auth.routes.js"));

app.use(errorHandler);

module.exports = app;
