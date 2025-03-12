// Code for the AuthProvider context
// Used in app>_layout.tsx to wrap the app in the AuthProvider context
// This context provides the user's authentication token and user data to the app
// It also provides functions to sign in and sign out


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
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await fetchUserData();
        if (response.success) {
          setAuthToken(token);
          setUser(response.user);
        } else {
          await AsyncStorage.removeItem('userToken');
          setAuthToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const signIn = async (token: string) => {
    await AsyncStorage.setItem('userToken', token);
    const response = await fetchUserData();
    if (response.success) {
      setAuthToken(token);
      setUser(response.user);
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('userToken');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authToken, user, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
