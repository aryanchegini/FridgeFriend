// context/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserData } from '../utils/api';

type AuthContextType = {
  authToken: string | null;
  user: any | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => useContext(AuthContext)!;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check token on initial app load
    const bootstrapAsync = async () => {
      try {
        console.log("Checking for stored auth token...");
        setIsLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        
        if (token) {
          console.log("Token found, verifying...");
          try {
            const response = await fetchUserData();
            if (response.success) {
              console.log("User data fetched successfully");
              setAuthToken(token);
              setUser(response.user);
            } else {
              console.log("Token invalid, clearing...");
              await AsyncStorage.removeItem('userToken');
              setAuthToken(null);
              setUser(null);
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            // In case of network error or other issues, we'll assume token is invalid
            await AsyncStorage.removeItem('userToken');
            setAuthToken(null);
            setUser(null);
          }
        } else {
          console.log("No token found");
          setAuthToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error in auth bootstrap:", error);
        // Handle any errors during the auth check
        setAuthToken(null);
        setUser(null);
      } finally {
        // Always set loading to false, even if there's an error
        setIsLoading(false);
      }
    };

    // Add a safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log("Auth loading timeout - forcing completion");
        setIsLoading(false);
      }
    }, 3000); // 3 second safety timeout

    bootstrapAsync();

    // Clean up the timeout when the component unmounts
    return () => clearTimeout(timeoutId);
  }, []);

  const signIn = async (token: string) => {
    try {
      console.log("Signing in with token...");
      await AsyncStorage.setItem('userToken', token);
      setAuthToken(token);
      
      const response = await fetchUserData();
      if (response.success) {
        console.log("Setting user data after sign in");
        setUser(response.user);
      } else {
        console.log("Failed to fetch user data after sign in");
      }
    } catch (error) {
      console.error("Error during sign in:", error);
      // If sign in fails, clear everything
      await AsyncStorage.removeItem('userToken');
      setAuthToken(null);
      setUser(null);
      throw error; // Re-throw to let the calling component handle it
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      await AsyncStorage.removeItem('userToken');
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error("Error during sign out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ authToken, user, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}