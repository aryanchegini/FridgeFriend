const cron = require("node-cron");
const { sendExpiryNotifications } = require("../utils/expiryNotificationService");

// Schedule job to run every day at 8 AM
cron.schedule("0 8 * * *", async () => {
  console.log("Running scheduled expiry notification job...");
  await sendExpiryNotifications();
}, {
  scheduled: true,
  timezone: "UTC"
});

