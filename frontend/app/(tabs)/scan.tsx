
import React, { useEffect, useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert, ToastAndroid, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { Camera, CameraType, CameraView } from 'expo-camera';
import { addProduct, scanBarcode } from '../../utils/api';

export default function Scan() {
  const [type, setFacing] = useState<CameraType>("back");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [productName, setProductName] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [dateOfExpiry, setDateOfExpiry] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const lastScannedTimestampRef = useRef(0);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    const timestamp = Date.now();
    if (scanned || (timestamp - lastScannedTimestampRef.current < 2000)) return;

    lastScannedTimestampRef.current = timestamp;
    setScanned(true);
    ToastAndroid.show("Scanned", ToastAndroid.SHORT);

    try {
      const response = await scanBarcode(data);
      console.log("API Response:", response);

      if (response?.success && response?.product?.success && response?.product?.product_name) {
        setProductName(response.product.product_name);
      } else {
        Alert.alert("Product Not Found", "No product information available for this barcode.", [
          { text: "OK", onPress: () => setScanned(false) }
        ]);
      }
    } catch (error) {
      console.error("Barcode scan failed:", error);
      Alert.alert("Error", "Failed to scan barcode. Please try again.");
      setScanned(false);
    }
  };

  const handleConfirmAddProduct = async () => {
    if (!productName) return;

    const formattedDate = dateOfExpiry.toISOString().split("T")[0]; // Convert date to YYYY-MM-DD

    const addProductResponse = await addProduct(productName, quantity, formattedDate, "not_expired");
    console.log("Add Product Response:", addProductResponse);

    if (addProductResponse.success) {
      Alert.alert("Success", `${productName} added to inventory!`);
    } else {
      Alert.alert("Failed", `Could not add ${productName}.\nReason: ${addProductResponse.message}`);
    }

    setScanned(false);
    setProductName(null);
    setQuantity(1);
  };

  useEffect(() => {
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
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>


      {productName && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{productName}</Text>

          {/* Quantity Selector */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.quantityButton}>
              <Text style={styles.quantityText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.quantityButton}>
              <Text style={styles.quantityText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.text}>Select Expiry Date: {dateOfExpiry.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateOfExpiry}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDateOfExpiry(selectedDate);
              }}
            />
          )}

          {/* Confirm Button */}
          <TouchableOpacity style={styles.button} onPress={handleConfirmAddProduct}>
            <Text style={styles.text}>Add Product</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={toggleFacing}>
        <Text style={styles.text}>Flip Camera</Text>
      </TouchableOpacity>
    </View>
  );
}

// TODO: FIX STYLING
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  button: {
    position: 'absolute',
    bottom: 150,
    backgroundColor: '#ff5252',
    padding: 10,
    borderRadius: 10,
    width: 150,
    alignItems: 'center',
  },
  text: { color: 'white', fontWeight: 'bold' },
  modal: {
    position: 'absolute',
    bottom: 50,
    width: '90%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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

  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  quantityButton: { padding: 10, backgroundColor: '#ddd', borderRadius: 5, marginHorizontal: 10 },
  quantityText: { fontSize: 18 },
  datePickerButton: { padding: 10, backgroundColor: '#009fbd', borderRadius: 5, marginVertical: 10 },
});

export default Scan;

