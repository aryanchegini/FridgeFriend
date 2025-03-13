import React from "react";
import { Image, StyleSheet } from "react-native";


// Create the Logo component
// The Logo component will contain the FridgeDriend logo from frontend>assets>images>icon.png
const Logo = () => {
  return <Image source={require("../assets/images/icon.png")} style={styles.logo} />;
};

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
});

export default Logo;
