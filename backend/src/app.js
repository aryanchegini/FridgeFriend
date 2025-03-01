// src/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db.js');

const { errorHandler } = require('./middleware/errorMiddleware');


const app = express();
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: false}))
app.use(helmet());
app.use(cors());


app.use('/products', require('./routes/product.routes.js'));
app.use('/groups', require('./routes/group.routes.js'));
app.use("/auth", require("./routes/auth.routes.js"));


app.use(errorHandler);

module.exports = app