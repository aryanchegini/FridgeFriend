const { Expo } = require("expo-server-sdk");
const Product = require("../models/product.model");
const User = require("../models/user.model");

const expo = new Expo();

exports.sendExpiryNotifications = async() => {
    try {
        const today = new Date();
        const threeDaysLater = new Date();

        // Products expiring within 3 days
        threeDaysLater.setDate(today.getDate() + 3);

        // Finding products expiring within 3 days
        const expiringProducts = await Product.find({
            dateOfExpiry: { $lte: threeDaysLater },
            status: "not_expired"
          }).populate("userId", "pushToken name");

        const userNotifications = {}; // Store notifications grouped by user IDs

        expiringProducts.forEach((product) => {
            if (!userNotifications[product.userId._id]) { // if user not present in the user to be notified array, new entry created with token and list of product about to expire (initially empty)
              userNotifications[product.userId._id] = {
                pushToken: product.userId.pushToken,
                products: []
              };
            }
            userNotifications[product.userId._id].products.push(product.productName); //product name added to product array
          });

        // Send notifications to each user
    for (const userId in userNotifications) {
        const { pushToken, products } = userNotifications[userId];
  
        if (pushToken && Expo.isExpoPushToken(pushToken)) {
          const message = `Your products (${products.join(", ")}) are expiring soon!`;
          const messages = [
            {
              to: pushToken,
              sound: "default",
              title: "Expiration Alert",
              body: message,
              data: { type: "expiry_notification", products }
            }
          ];
  
          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }
        }
      }
  
      console.log("Expiry notifications sent successfully.");
    } catch (error) {
      console.error("Error sending expiry notifications:", error);
    }
  };
      


   