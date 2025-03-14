import React from "react";
import { Text, StyleSheet } from "react-native";
import { theme } from "../constants/theme";

const Header = ({ children }: { children: React.ReactNode }) => {
  return <Text style={styles.header}>{children}</Text>;
};

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
});

export default Header;
