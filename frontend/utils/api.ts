import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/auth"; 


// Register User
export const registerUser = async (name: string, email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Registration failed");

    // Store token on successful registration
    await AsyncStorage.setItem("userToken", data.token);
    return { success: true, user: data.user };
  } catch (error: any) {
    return { success: false, message: error.message || "Error registering user" };
  }
};

// Login User
export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");

    // Store token on successful login
    await AsyncStorage.setItem("userToken", data.token);
    return { success: true, user: data.user };
  } catch (error: any) {
    return { success: false, message: error.message || "Error logging in" };
  }
};

// Fetch User Data (Protected)
export const fetchUserData = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch user data");

    return { success: true, user: data.data };
  } catch (error: any) {
    return { success: false, message: error.message || "Error fetching user data" };
  }
};

// Logout (Remove Token)
export const logoutUser = async () => {
  await AsyncStorage.removeItem("userToken");
};
