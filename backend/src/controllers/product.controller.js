// Have access to req.params.user_id //Gets the id of the product from the URL params
const asyncHandler = require('express-async-handler');
const productModel = require('../models/product.model');
const inventoryModel = require('../models/userInventory.model');

const allowedStatus = ['not_expired', 'expired', 'consumed'];

const getProducts = asyncHandler(async (req, res) => {
    const products = await productModel.find({ userId: req.params.userId });
    res.json(products);
    });


// @route POST /products/
const setProduct = asyncHandler(async (req, res) => {

    // Prodct belongs to the inventory linked to the userId in the params
    // Check if user inventory exists
    const inventory = await inventoryModel.findOne({ userId: req.params.userId });
    if (!inventory) {
        res.status(404);
        throw new Error('Inventory not found');
    }

    // Checking required field values
    if(!req.body.productName || !req.body.quantity || !req.body.dateOfExpiry) {
        res.status(400);
        throw new Error('Missing required fields');
    }

    const {productName, quantity, dateOfExpiry} = req.body;
    
    // Handling optional field: status
    const {status} = 'not_expired';
    if (req.body.status) {
        if (!allowedStatus.includes(req.body.status)) {
            res.status(400);
            throw new Error('Invalid status');
        }
        status = req.body.status;
    }

    // Final product creation
    const product = await productModel.create(({
        userId: req.params.userId,
        productName: productName,
        quantity: quantity,
        dateLogged: Date.now(),
        dateOfExpiry: dateOfExpiry,
        status: status,
        inventoryId: inventory._id
    }));

    res.status(201).json(product);
});

const updateProductStatus = asyncHandler(async (req, res) => {
    const {productId} = req.params.productId;
    const {status} = req.body.status;

    // Check if product exists
    const product = await productModel.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    // Checking if status is valid
    if (!allowedStatus.includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }
    else {
        product.status = status;
        await product.save();
    }


});

const deleteProduct = asyncHandler(async (req, res) => {});

module.exports = { getProducts, setProduct, updateProductStatus, deleteProduct };
