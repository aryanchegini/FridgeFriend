import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

// Import the theme file to get the colour from frontend>constants>theme.tsx
import { theme } from "../constants/theme";

// Button component with the colour from theme.tsx file
// Change button colour when disabled
// Change button mode to outlined
// Change button mode to contained


// Create the Button component
interface ButtonProps {
    mode?: "contained" | "outlined";
    onPress: () => void;
    disabled?: boolean; // Allow disabled prop
    children: React.ReactNode;
}

// Create the Button component
export default function Button({ mode = "contained", onPress, disabled, children }: ButtonProps) {
    return (
      <TouchableOpacity
        style={[styles.button, mode === "outlined" && styles.outlined, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled} // Pass disabled prop to TouchableOpacity
      >
        <Text style={styles.text}>{children}</Text>
      </TouchableOpacity>
    );
  }
  
// Create the styles for the Button component
  const styles = StyleSheet.create({
    button: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: theme.colors.secondary,
      alignItems: "center",
    },

    outlined: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: "#000000", // Black hex #000000
    },
    disabled: {
      backgroundColor: "#A0A0A0", // Change button color when disabled
    },
    text: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
    },
  });