//req.params.user_id //Gets the id of the product from the URL

const asyncHandler = require('express-async-handler');
const productModel = require('../models/product.model');

const getProducts = asyncHandler(async (req, res) => {
    const products = await productModel.find({ userId: req.params.user_id });
    res.json(products);
    });
