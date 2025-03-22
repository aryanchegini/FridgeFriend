import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { addProduct, scanBarcode } from '@/utils/api';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function Scan() {
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [productName, setProductName] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [dateOfExpiry, setDateOfExpiry] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const lastScannedTimestampRef = useRef(0);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Request camera permission on component mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // Prevent multiple scans too quickly
    const timestamp = Date.now();
    if (scanned || (timestamp - lastScannedTimestampRef.current < 2000)) return;
    
    lastScannedTimestampRef.current = timestamp;
    setScanned(true);
    setScanning(false);
    setIsLoading(true);
    
    try {
      const response = await scanBarcode(data);
      setIsLoading(false);
      
      if (response?.success && response.product?.product_name) {
        setProductName(response.product.product_name);
        setIsModalVisible(true);
      } else {
        Alert.alert(
          "Product Not Found", 
          "Product not found. Would you like to enter details manually?",
          [
            { 
              text: "Yes", 
              onPress: () => {
                setProductName("");
                setIsModalVisible(true);
              }
            },
            { 
              text: "No", 
              onPress: () => {
                setScanned(false);
                setScanning(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Barcode scan failed:", error);
      Alert.alert("Error", "Failed to scan barcode. Please try again.");
      setScanned(false);
      setScanning(true);
    }
  };

  const handleConfirmAddProduct = async () => {
    if (!productName.trim()) {
      Alert.alert("Error", "Product name is required");
      return;
    }

    setIsLoading(true);
    const formattedDate = dateOfExpiry.toISOString().split("T")[0]; // Convert date to YYYY-MM-DD

    try {
      const addProductResponse = await addProduct(productName, quantity, formattedDate, "not_expired");
      setIsLoading(false);
      
      if (addProductResponse.success) {
        Alert.alert(
          "Success", 
          `${productName} added to your inventory!`,
          [{ text: "OK", onPress: resetForm }]
        );
      } else {
        Alert.alert("Failed", `Could not add product.\nReason: ${addProductResponse.message}`);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const resetForm = () => {
    setScanned(false);
    setScanning(true);
    setProductName("");
    setQuantity(1);
    setDateOfExpiry(new Date());
    setIsModalVisible(false);
  };

  const toggleCameraType = () => {
    setCameraType(current => (current === "back" ? "front" : "back"));
  };

  const startScanning = () => {
    setScanning(true);
    setScanned(false);
  };

  // Handle camera permission status
  if (hasPermission === null) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.statusText}>Camera access is required to scan barcodes</Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {scanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={cameraType}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ 
              barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] 
            }}
          />
          
          <View style={styles.overlay}>
            <View style={styles.scannerHeader}>
              <Text style={styles.headerText}>Scan Product Barcode</Text>
            </View>
            
            <View style={styles.scanBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            {/* Removed from bottom section and added within scan box */}
            <Text style={styles.scanBoxText}>
              Position the barcode within the frame
            </Text>
          </View>

          <View style={[styles.buttonContainer, { bottom: tabBarHeight }]}>
            <TouchableOpacity style={styles.circleButton} onPress={toggleCameraType}>
              <IconSymbol name="camera.rotate.fill" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.manualButton} 
              onPress={() => {
                setScanning(false);
                setProductName("");
                setIsModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.startContainer}>
          {!isModalVisible && (
            <>
              <Text style={styles.startText}>Ready to scan products?</Text>
              <TouchableOpacity style={styles.startButton} onPress={startScanning}>
                <Text style={styles.buttonText}>Start Scanning</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Product Details Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, tabBarHeight) }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Product Details</Text>
              
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <>
                  <Text style={styles.inputLabel}>Product Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="Enter product name"
                  />

                  <Text style={styles.inputLabel}>Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity 
                      onPress={() => setQuantity(Math.max(1, quantity - 1))} 
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity 
                      onPress={() => setQuantity(quantity + 1)} 
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)} 
                    style={styles.datePickerButton}
                  >
                    <Text style={styles.dateText}>
                      {dateOfExpiry.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={dateOfExpiry}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDateOfExpiry(selectedDate);
                      }}
                    />
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={() => {
                        setIsModalVisible(false);
                        setScanned(false);
                        setScanning(true);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.saveButton]} 
                      onPress={handleConfirmAddProduct}
                    >
                      <Text style={styles.saveButtonText}>Save Product</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 40,
  },
  scannerHeader: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scanBox: {
    width: 250, 
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
    marginTop: 60,
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanBoxText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 120, // Increased to provide more space above the buttons
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 10,
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  startText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.primary,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.secondary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 30,
  },
  dateText: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
