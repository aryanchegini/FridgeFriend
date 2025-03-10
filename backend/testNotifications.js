const { Expo } = require("expo-server-sdk");
const User = require("./src/models/user.model");
const mongoose = require("mongoose");
require("dotenv").config();

const expo = new Expo();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"));

async function sendTestNotification() {
  try {
    // Get a user with a push token
    const user = await User.findOne({ pushToken: { $ne: null } });

    if (!user || !Expo.isExpoPushToken(user.pushToken)) {
      console.log("No valid Expo push token found.");
      return;
    }

    // Create notification message
    const messages = [{
      to: user.pushToken,
      sound: "default",
      title: "Test Notification",
      body: "This is a test push notification from the backend!",
      data: { test: "notification" }
    }];

    // Send notification
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    console.log("Push notification sent successfully!");

  } catch (error) {
    console.error("Error sending test notification:", error);
  }
}

sendTestNotification();