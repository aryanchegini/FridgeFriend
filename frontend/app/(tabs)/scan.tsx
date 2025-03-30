import React, { useEffect, useState, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera, CameraType, CameraView } from "expo-camera";
import { addProduct, scanBarcode } from "@/utils/api";
import { theme } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

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

  // For date display
  const [dateText, setDateText] = useState("");

  const lastScannedTimestampRef = useRef(0);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Format date for display
  useEffect(() => {
    const formattedDate = dateOfExpiry.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    setDateText(formattedDate);
  }, [dateOfExpiry]);

  // Request camera permission on component mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    // Prevent multiple scans too quickly
    const timestamp = Date.now();
    if (scanned || timestamp - lastScannedTimestampRef.current < 2000) return;

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
              },
            },
            {
              text: "No",
              onPress: () => {
                setScanned(false);
                setScanning(true);
              },
            },
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
      const addProductResponse = await addProduct(
        productName,
        quantity,
        formattedDate,
        "not_expired"
      );
      setIsLoading(false);

      if (addProductResponse.success) {
        // Give haptic feedback on success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert("Success", `${productName} added to your inventory!`, [
          { text: "OK", onPress: resetForm },
        ]);
      } else {
        Alert.alert(
          "Failed",
          `Could not add product.\nReason: ${addProductResponse.message}`
        );
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
    setShowDatePicker(false);
  };

  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  const startScanning = () => {
    setScanning(true);
    setScanned(false);
  };

  // Date picker component based on platform
  // Find this section in your code:
  const renderDatePicker = () => {
    if (Platform.OS === "ios") {
      return (
        <View style={styles.iosDatePickerContainer}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Choose Expiry Date</Text>
            <TouchableOpacity
              style={styles.datePickerDoneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={dateOfExpiry}
            mode="date"
            display="spinner"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (selectedDate) setDateOfExpiry(selectedDate);
            }}
            style={styles.iosPicker}
            textColor="#000000" // Add this line to set the text color to black
          />
        </View>
      );
    } else {
      // For Android, we need a different approach
      return (
        <DateTimePicker
          value={dateOfExpiry}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDateOfExpiry(selectedDate);
          }}
          themeVariant="light" // Add this line for Android
        />
      );
    }
  };

  // Handle camera permission status
  if (hasPermission === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.statusText}>
          Camera access is required to scan barcodes
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
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
              barcodeTypes: [
                "qr",
                "ean13",
                "ean8",
                "upc_a",
                "upc_e",
                "code128",
              ],
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

            <Text style={styles.scanBoxText}>
              Position the barcode within the frame
            </Text>
          </View>

          <View style={[styles.buttonContainer, { bottom: tabBarHeight }]}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={toggleCameraType}
            >
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
              <Text style={styles.startEmoji}>📷</Text>
              <Text style={styles.startText}>Ready to scan products?</Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={startScanning}
              >
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
        onRequestClose={() => {
          setIsModalVisible(false);
          setShowDatePicker(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitleIcon}>📝</Text>
                <Text style={styles.modalTitle}>Product Details</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsModalVisible(false);
                  setShowDatePicker(false);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.modalBody}>
                {/* Product Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Product Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="Enter product name"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Quantity Selector */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => setQuantity(quantity + 1)}
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Expiry Date */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateText}>{dateText}</Text>
                    <Text style={styles.calendarIcon}>📅</Text>
                  </TouchableOpacity>
                </View>

                {/* Show the date picker if requested */}
                {showDatePicker && renderDatePicker()}

                {/* Add to Inventory Button */}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleConfirmAddProduct}
                >
                  <Text style={styles.addButtonText}>Add to Inventory</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 40,
  },
  scannerHeader: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 20,
  },
  headerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  scanBox: {
    width: 250,
    height: 250,
    position: "relative",
    backgroundColor: "transparent",
    marginTop: 60,
    marginBottom: 20,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "white",
    borderWidth: 3,
    backgroundColor: "transparent",
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
    color: "white",
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 120,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  buttonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    zIndex: 10,
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  manualButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    color: theme.colors.text,
    padding: 20,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  startContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  startEmoji: {
    fontSize: 50,
    marginBottom: 20,
  },
  startText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: theme.colors.text,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxHeight: "90%",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  modalBody: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  // Quantity selector styles
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
  },
  quantityText: {
    fontSize: 24,
    fontWeight: "bold",
    minWidth: 80,
    textAlign: "center",
  },
  // Date styles
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  calendarIcon: {
    fontSize: 18,
  },
  // iOS Date Picker
  iosDatePickerContainer: {
    backgroundColor: "white", // Change from #f9f9f9 to white for better contrast
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  datePickerDoneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  datePickerDoneText: {
    color: "white",
    fontWeight: "bold",
  },
  // And update the iosPicker style:
  iosPicker: {
    height: 180,
    backgroundColor: "white", // Add this to ensure white background
  },
  // Add button
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});
