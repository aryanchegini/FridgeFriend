// app/(auth)/sign-up.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { registerUser } from '../../utils/api';
import { useAuth } from '../../context/AuthProvider';
import { theme } from '../../constants/theme';

import Button from '../../components/Button';
import TextInput from '../../components/TextInput';
import Logo from '../../components/Logo';

export default function SignupScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    const response = await registerUser(name, email, password);

    if (response.success) {
      // await signIn(response.user.token); TODO: Address this
      router.replace('/(auth)/login' as any);
    } else {
      Alert.alert('Signup Failed', response.message);
    }
  };

  return (
    <View style={styles.container}>
      <Logo />

      <Text style={styles.header}>Create Your Account</Text>

      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
      />

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

      <Button onPress={handleSignup}>Sign up</Button>

      <View style={styles.loginRow}>
        <Text>Already have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
          <Text style={styles.loginLink}>Log in</Text>
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
  loginRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.large,
  },
  loginLink: {
    color: theme.colors.primary,
    marginLeft: 5,
  },
});
