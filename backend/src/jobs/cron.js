const cron = require("node-cron");
const logger = require("../utils/logger");
const productService = require("../services/product.service");
const notificationService = require("../services/notification.service");


// Initialize all scheduled jobs in the application
const initScheduledJobs = () => {
  logger.info("Initializing scheduled jobs...");
  
  // PRODUCT JOBS
  
  // Run expiry check and score updates twice daily at midnight and noon
  cron.schedule('0 0,12 * * *', async () => {
    logger.info("Running scheduled expiry and score updates");
    await productService.updateExpiryAndScores();
  });
  
  // Run monthly cleanup on the 1st of every month at 1 AM
  cron.schedule('0 1 1 * *', async () => {
    logger.info("Running monthly product cleanup");
    await productService.monthlyCleanup();
  });
  
  
  // NOTIFICATION JOBS
  
  // Run expiry notifications every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    logger.info("Sending scheduled expiry notifications");
    await notificationService.sendExpiryNotifications();
  });
  
  // Run leaderboard notifications once a week on Sunday at 12:00 PM
  cron.schedule('0 12 * * 0', async () => {
    logger.info("Sending scheduled leaderboard notifications");
    await notificationService.sendLeaderboardNotifications();
  });
  
  logger.info("All scheduled jobs initialized");
};

module.exports = { initScheduledJobs };