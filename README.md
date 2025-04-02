# FridgeFriend - Food Inventory Management App

A mobile application for tracking food inventory, expiration dates, and reducing food waste.

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file in the backend directory:**
   ```env
   HOST=0.0.0.0
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=
   MONGODB_URI=
   MONGODB_TEST_URI=
   REDIS_URL=
   REDIS_PASSWORD=
   ```

3. **Start the backend server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory and install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Create `.env` file in the frontend directory:**
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_IP_ADDRESS>:3000
   ```

   **Find your IP address:**
   - **macOS/Linux:** `ipconfig getifaddr en0`
   - **Windows:** `ipconfig`

3. **Start the Expo app:**
   ```bash
   npm start
   ```

4. **Scan the QR code with the Expo Go app on your mobile device.**

## Running Tests

- **Backend tests:**
  ```bash
  cd backend
  npm test
  ```

- **Frontend tests:**
  ```bash
  cd frontend
  npm test
  ```

## Features

- **Barcode scanning** to add products  
- **Expiration date tracking**  
- **Group sharing** with leaderboards  
- **Push notifications** for expiring products  
- **Score system** to encourage food waste reduction
