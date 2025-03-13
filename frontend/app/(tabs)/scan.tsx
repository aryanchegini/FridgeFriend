import React, { useEffect, useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert, ToastAndroid } from 'react-native';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { addProduct, scanBarcode } from '../../utils/api';

export default function Scan() {
  // TODO: Get rid of hardcoded values
  const quantity = 1;
  const dateOfExpiry = "2025-04-30";

  const [type, setFacing] = useState<CameraType>("back");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const lastScannedTimestampRef = useRef(0); // Stores last scan timestamp

const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
  const timestamp = Date.now();
  
  // Prevent rapid scanning (debouncing)
  if (scanned || (timestamp - lastScannedTimestampRef.current < 2000)) {
    return;
  }

  lastScannedTimestampRef.current = timestamp;
  setScanned(true);
  ToastAndroid.show("Scanned", ToastAndroid.SHORT);

  try {
    const response = await scanBarcode(data);

    if (response?.success && response?.product?.success && response?.product?.product_name) {
      const productName = response.product.product_name;

      Alert.alert(
        "Product Found",
        `Name: ${productName}\nType: ${type}\nData: ${data}\n\nPress OK to add to inventory.`,
        [
          { 
            text: "OK", 
            onPress: async () => {
              const addProductResponse = await addProduct(productName, quantity, dateOfExpiry, "not_expired");

              if (addProductResponse.success) {
                Alert.alert("Success", `${productName} added to inventory!`);
              } else {
                Alert.alert("Failed", `Could not add ${productName}.\nReason: ${addProductResponse.message}`);
              }

              setScanned(false);
            }
          },
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => setScanned(false) 
          }
        ]
      );
    } else {
      Alert.alert(
        "Product Not Found",
        "No product information available for this barcode.",
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    }
  } catch (error) {
    console.error("Barcode scan failed:", error);
    Alert.alert("Error", "Failed to scan barcode. Please try again.");
    setScanned(false);
  }
};  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need permission to use the camera</Text>
        <Button title="Grant Permission" onPress={async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
        }} />
      </View>
    );
  }

  function toggleFacing() {
    setFacing(current => (current === "back" ? "front" : "back"));
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={type}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={toggleFacing}>
        <Text style={styles.text}>Flip Camera</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  button: {
    position: 'absolute',
    bottom: 150,
    backgroundColor: '#ff5252',
    padding: 10,
    borderRadius: 10,
    width: 150,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250, 
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 5,
    backgroundColor: 'white',
  },
  topLeft: { top: -2, left: -2 },
  topRight: { top: -2, right: -2 },
  bottomLeft: { bottom: -2, left: -2 },
  bottomRight: { bottom: -2, right: -2 },
});

