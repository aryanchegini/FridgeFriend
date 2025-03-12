// Checks auth state via useAuth hook and redirects to the appropriate route
// It can send the user to (tabs) if they are authenticated or (auth)/login if they are not


import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { View, ActivityIndicator } from 'react-native';

export default function AppIndex() {
  const { authToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return authToken ? (
    <Redirect href={'/(tabs)' as any} />
  ) : (
    <Redirect href={'/(auth)/login' as any} />
  );
}
