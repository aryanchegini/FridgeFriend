// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Get the base URL from environment variable or use a fallback
// Make sure this points to the correct API endpoint
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"; 

// Register User
export const registerUser = async (name: string, email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    // Check if token exists before storing
    if (data.token) {
      await AsyncStorage.setItem("userToken", data.token);
      return { success: true, user: data.user, token: data.token };
    } else {
      console.warn("No token received from registration endpoint");
      return { success: true, user: data.user, token: null };
    }
    
  } catch (error: any) {
    console.error("Registration error:", error.message);
    return { success: false, message: error.message || "Error registering user" };
  }
};

// Login User
export const loginUser = async (email: string, password: string) => {
  try {
    console.log(`Attempting to login with email: ${email}`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Login response:", JSON.stringify(data));
    
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Verify token exists before storing
    if (data.token) {
      await AsyncStorage.setItem("userToken", data.token);
      return { 
        success: true, 
        user: { ...data.user, token: data.token }  // Include token in user object
      };
    } else {
      console.error("No token received from login endpoint");
      throw new Error("Authentication failed: No token received");
    }
    
  } catch (error: any) {
    console.error("Login error:", error.message);
    return { success: false, message: error.message || "Error logging in" };
  }
};

// Fetch User Data (Protected)
export const fetchUserData = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      console.log("No token found, user is not authenticated");
      return { success: false, message: "Unauthorized" };
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch user data");
    }

    return { success: true, user: data.data || data };
    
  } catch (error: any) {
    console.error("Error fetching user data:", error.message);
    return { success: false, message: error.message || "Error fetching user data" };
  }
};

// Logout (Remove Token)
export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem("userToken");
    return { success: true };
  } catch (error: any) {
    console.error("Logout error:", error.message);
    return { success: false, message: error.message };
  }
};


// Get product from barcode
export const scanBarcode = async (barcode: string) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/barcodes/${barcode}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Scan Failed" );

    return { success: true, product: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Error Scanning Barcode" };
  }
};


// Add product
export const addProduct = async (
  productName: string,
  quantity: number,
  dateOfExpiry: string,
  status?: string
) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productName, quantity, dateOfExpiry, status }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to add product");

    return { success: true, product: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Error adding product" };
  }
};

// Get products
export const getProducts = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/products`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error retrieving products" );

    return { success: true, product: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Error retrieving products" };
  }
};

// Delete product
export const deleteProduct = async (productId: string) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error deleting product");

    return { success: true, message: "Product Deleted Successfully!" };
  } catch (error: any) {
    return { success: false, message: error.message || "Error deleting product" };
  }
};

// Get all groups the user is in
export const getGroups = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/groups`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error retrieving groups");

    return { success: true, groups: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Error retrieving groups" };
  }
};

// Create a new group
export const createGroup = async (groupName: string) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ group_name: groupName }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error creating group");

    return { success: true, group: data.group };
  } catch (error: any) {
    return { success: false, message: error.message || "Error creating group" };
  }
};

// Join a group by its code
export const joinGroup = async (groupCode: string) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/groups/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ group_code: groupCode }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error joining group");

    return { success: true, message: data.message };
  } catch (error: any) {
    return { success: false, message: error.message || "Error joining group" };
  }
};

// Get current user's score
export const getUserScore = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/user/score`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error retrieving score");

    return { success: true, score: data.score };
  } catch (error: any) {
    return { success: false, message: error.message || "Error retrieving score" };
  }
};

// Add this function to your utils/api.ts file

// Update product status (Add this function to your API utilities)
export const updateProductStatus = async (productId: string, status: string) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return { success: false, message: "Unauthorized" };

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update product status");

    return { success: true, product: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Error updating product status" };
  }
};