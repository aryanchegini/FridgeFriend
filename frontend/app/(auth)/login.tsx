// app/(auth)/login.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser } from '../../utils/api';
import { useAuth } from '../../context/AuthProvider';
import { theme } from '../../constants/theme';
import Logo from '../../components/Logo';

import Button from '../../components/Button';
import TextInput from '../../components/TextInput';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const response = await loginUser(email, password);

    if (response.success) {
      // await signIn(response.user.token); TODO: Address this
      router.replace('/(tabs)' as any);
    } else {
      Alert.alert('Login Failed', response.message);
    }
  };

  return (
    <View style={styles.container}>
      <Logo /> 

      <Text style={styles.header}>Welcome Back</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button onPress={handleLogin}>Log in</Button>

      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => router.push('/(auth)/forgot-password' as any)}
      >
        <Text style={styles.link}>Forgot password?</Text>
      </TouchableOpacity>

      <View style={styles.signupRow}>
        <Text>Don't have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/sign-up' as any)}>
          <Text style={styles.signupLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
  },
  header: {
    fontSize: theme.fontSizes.heading,
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    marginVertical: theme.spacing.large,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.medium,
  },
  signupRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.large,
    justifyContent: 'center',
  },
  link: {
    color: theme.colors.primary,
  },
  signupLink: {
    color: theme.colors.primary,
    marginLeft: 5,
  },
});
