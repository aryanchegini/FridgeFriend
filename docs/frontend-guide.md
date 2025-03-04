# FridgeFriend Frontend Guide

## Prerequisites

Before running the frontend, ensure you have the following installed:


- [Expo Go](https://expo.dev/client) (for running the app on your mobile device)
- **iOS:** Xcode (for running on iOS simulator)
- **Android:** Android SDK (for running on Android emulator)

---

## Setup and Running the Frontend

1. Clone the repository and navigate into it:
   ```sh
   git clone https://github.com/aryanchegini/FridgeFriend.git && cd FridgeFriend
   ```

2. Navigate into the `frontend` directory:
   ```sh
   cd frontend
   ```

3. Install dependencies:
   ```sh
   npm install
   ```

4. Start the Expo development server:
   ```sh
   npm start
   ```

   This will provide options to run the app on different platforms.

---

## Running the App

You can run the app on different platforms as follows:

- **Web:**
  ```sh
  npm run web
  ```
  Open `http://localhost:8081` in your browser.

- **iOS Simulator (Mac Only, Requires Xcode):**
  ```sh
  npm run ios
  ```

- **Android Emulator (Requires Android SDK):**
  ```sh
  npm run android
  ```

- **Mobile Device:**
  - Scan the QR code displayed in the terminal using the **Expo Go** app.
  - The app will automatically launch on your phone.

---

## Troubleshooting

- If the app fails to start, ensure you have all prerequisites installed.
- If running on iOS, make sure Xcode is installed and configured.
- If running on Android, ensure that an emulator or a connected device is available.
- Restart the Expo server if necessary:
  ```sh
  npm start --clear
  
