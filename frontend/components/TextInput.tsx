import React from "react";
import { View, Text, TextInput as RNTextInput, StyleSheet } from "react-native";
import { theme } from "../constants/theme";

const TextInput = ({ label, value, onChangeText, secureTextEntry = false }: { label: string; value: string; onChangeText: (text: string) => void; secureTextEntry?: boolean }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc", // Light gray border
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
});

export default TextInput;
