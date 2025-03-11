// Have access to req.user._id
const asyncHandler = require("express-async-handler");
const productModel = require("../models/product.model");
const inventoryModel = require("../models/userInventory.model");

const cron = require("node-cron");

const allowedStatus = ["not_expired", "expired", "consumed"];

// @route GET /products/
const getProducts = asyncHandler(async (req, res) => {
  const products = await productModel.find({ userId: req.user._id });

  res.status(200);
  res.json(products);
});

// @route POST /products/
const createProduct = asyncHandler(async (req, res) => {
  // Product belongs to the inventory linked to the user Id
  // Check if user inventory exists
  const inventory = await inventoryModel.findOne({ userId: req.user._id });
  if (!inventory) {
    res.status(400);
    throw new Error("Inventory not found");
  }

  // Checking required field values
  if (!req.body.productName || !req.body.quantity || !req.body.dateOfExpiry) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  const { productName, quantity, dateOfExpiry } = req.body;

  // Handling optional field: status
  let status = "not_expired";
  if (req.body.status) {
    if (!allowedStatus.includes(req.body.status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    status = req.body.status;
  }

  // Checking if dateOfExpiry is a valid date
  if (isNaN(Date.parse(dateOfExpiry))) {
    res.status(400);
    throw new Error("Invalid date format");
  }

  // Checking if quantity is a positive number
  if (isNaN(quantity) || quantity <= 0) {
    res.status(400);
    throw new Error("Quantity must be a positive number");
  }

  // Final product creation
  const product = await productModel.create({
    userId: req.user._id,
    productName: productName,
    quantity: quantity,
    dateLogged: Date.now(),
    dateOfExpiry: dateOfExpiry,
    status: status,
    inventoryId: inventory._id,
  });

  // SCORING --------------------------------------------------------------

  const daysRemaining = calculateDaysRemaining(new Date(dateOfExpiry));
  const initialScore = calculateProductScore(daysRemaining, status);

  if (initialScore !== 0) {
    inventory.score += initialScore;
    await inventory.save();
  }
  // ------------------------------------------------------------------------

  res.status(201);
  res.json(product);

});

const updateProductStatus = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  const status = req.body.status;
  const oldStatus = req.body.status;

  // Find product & ensure ownership
  const product = await productModel.findOne({
    _id: productId,
    userId: req.user._id,
  });
  if (!product) {
    return res
      .status(403)
      .json({ success: false, message: "You do not own this product" });
  }

  // Checking if status is valid
  if (!allowedStatus.includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  } else {
    product.status = status;
    await product.save();

    // If product is being consumed, handle special scoring
    let consumptionBonus = 0;
    if (status === 'consumed' && oldStatus !== 'consumed') {
      consumptionBonus = await handleConsumptionScore(productId);
    }

    res.status(200);
    res.json({
      message: "Status Updated Successfully!",
      updatedProduct: product,
    });
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.productId;

  // Check if product exists
  // Find product & ensure ownership
  const product = await productModel.findOne({
    _id: productId,
    userId: req.user._id,
  });
  if (!product) {
    return res
      .status(403)
      .json({
        success: false,
        message: "Unauthorized: You do not own this product",
      });
  } else {
    await productModel.findByIdAndDelete(productId);
    res.status(200);
    res.json({ message: "Product Deleted Successfully!" });
  }
});

// SCORING AND DATABASE UPDATING BASED ON PRODUCT STATUS --------------------

const calculateDaysRemaining = (expiryDate) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  return Math.floor((expiry - currentDate) / (1000 * 60 * 60 * 24));
};

const calculateProductScore = (daysRemaining, status) => {
  
  if (status === 'consumed') {
    return 0;
  }
  
  if (status === 'expired' || daysRemaining < 0) {
    return -5;
  }
  
  if (daysRemaining === 0) {
    return 0; // Day of expiry
  }
  else if (daysRemaining >= 1 && daysRemaining <= 9) {
    return daysRemaining; 
  }
  else if (daysRemaining >= 10) {
    return 10; 
  }
  else {
    return 0; 
  }
};

const updateExpiryAndScores = asyncHandler(async () => {
  try {
    console.log("Starting expiry checks and score updates...");
    
    // Get all active products (not consumed)
    const products = await productModel.find({
      status: { $ne: 'consumed' }
    });
    
    // Track score updates by user
    const userScores = {};
    
    // Process each product
    for (const product of products) {
      const originalStatus = product.status;
      const daysRemaining = calculateDaysRemaining(product.dateOfExpiry);
      
      // Check if product has expired
      if (daysRemaining < 0 && originalStatus === 'not_expired') {
        product.status = 'expired';
        await product.save();
      }
      
      // Calculate score for this product
      const productScore = calculateProductScore(daysRemaining, product.status);
      
      // Track score by user
      if (!userScores[product.userId]) {
        userScores[product.userId] = 0;
      }
      userScores[product.userId] += productScore;
    }
    
    // Update all user inventory scores
    for (const userId in userScores) {
      // Find user's inventory and update score
      const inventory = await inventoryModel.findOne({ userId });
      if (inventory) {
        // Reset score rather than increment, to ensure accurate calculation
        inventory.score = userScores[userId];
        await inventory.save();
      }
    }

    console.log(`Updated expiry status and scores for ${products.length} products`);
  } 
  catch (error) {
    console.error('Error in scheduled expiry and score updates:', error);
  }
});

const handleConsumptionScore = asyncHandler(async (productId) => {
  const product = await productModel.findById(productId);
  if (!product) return 0;
  
  const daysRemaining = calculateDaysRemaining(product.dateOfExpiry);
  let consumptionBonus = 0;
  
  // Product is consumed before expiry
  if (daysRemaining >= 0) {
    let dayScore = calculateProductScore(daysRemaining, 'not_expired');
    consumptionBonus = dayScore + 3; // Day score + 3 points bonus
    
    // Update user's inventory score with the consumption bonus
    const inventory = await inventoryModel.findOne({ userId: product.userId });
    if (inventory) {
      inventory.score += consumptionBonus;
      await inventory.save();
    }
  }
  
  return consumptionBonus;
});

const monthlyCleanup = asyncHandler(async () => {
  try {
    console.log("Starting monthly cleanup...");
    
    const result = await productModel.deleteMany({
      status: { $in: ['expired', 'consumed'] }
    });
    
    console.log(`Deleted ${result.deletedCount} expired/consumed products`);
    
    await updateExpiryAndScores();
    
    console.log("Monthly cleanup completed");
  } catch (error) {
    console.error('Error in monthly cleanup:', error);
  }
});

// Setup scheduled tasks
const setupScheduledTasks = () => {
  // Run twice daily at midnight and noon
  cron.schedule('0 0,12 * * *', updateExpiryAndScores);
  
  // Run on the 1st of every month at 1 AM
  cron.schedule('0 1 1 * *', monthlyCleanup);
  
  console.log("Scheduled tasks initialized");
};
setupScheduledTasks();

module.exports = {
  getProducts,
  createProduct,
  updateProductStatus,
  deleteProduct,

  // Export these for testing or manual triggering
  updateExpiryAndScores,
  monthlyCleanup
};
