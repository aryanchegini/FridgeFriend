import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";


// Create the BackButton component
// The BackButton component will contain the string "←" and will navigate back to the previous page when clicked
export default function BackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.button}>
      <Text style={styles.text}> ← </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 40, // Adjust based on your design
    left: 20,
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
});
