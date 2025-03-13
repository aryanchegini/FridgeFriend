import React from 'react';
import { View, StyleSheet } from 'react-native';

// Import the theme file to get the colour from frontend>constants>theme.tsx
import { theme } from '../constants/theme';


// Background component with the colour from theme.tsx file
// Center the children components
// Padding 20px

// Create the Background component
const Background = ({ children }: { children: React.ReactNode }) => {
    return <View style={styles.container}>{children}</View>;
};

// Create the styles for the Background component
const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
    },
});

// Export the Background component
export default Background;