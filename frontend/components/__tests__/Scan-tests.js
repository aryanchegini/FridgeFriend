import React from "react";
import { render, waitFor, screen, fireEvent} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Alert } from "react-native";
import * as api from "../../utils/api";
import Scan from "../../app/(tabs)/Scan"; 
const mockAlert = jest.spyOn(Alert, "alert");

// Mock the API
jest.mock("../../utils/api", () => ({
  scanBarcode: jest.fn(),
  addProduct: jest.fn()
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 50
}));

// Mock the camera
jest.mock("expo-camera", () => {
  return {
    Camera: {
      requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    },
    CameraView: jest.fn(({ onBarcodeScanned, ...props }) => {
        return (
          <mock-camera 
            testID="mock-camera"
            {...props}
            onBarCodeScanned={(event) => {
              if (onBarcodeScanned) {
                onBarcodeScanned({
                  type: "qr",
                  data: event.nativeEvent.data
                });
              }
            }}
          />
        );
      }),
    CameraType: {
      back: "back",
      front: "front"
    }
  };
});

// Helper functions
const simulateBarcodeScan = async (barcode = "12345") => {
  const mockCamera = screen.getByTestId("mock-camera");
  fireEvent(mockCamera, "onBarCodeScanned", { 
    nativeEvent: { 
      data: barcode, 
      type: "qr" 
    } 
  });

  await waitFor(() => {
    expect(api.scanBarcode).toHaveBeenCalledWith(barcode);
  });
};

const openManualScan = async () => {
  fireEvent.press(await screen.findByText("Start Scanning",{},{timeout: 3000}));
  fireEvent.press(await screen.findByText("Manual Entry"));
};

describe("Scan Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Can successfully manually input items", async () => {
    api.addProduct.mockResolvedValue({
        success: true,
    });
    
    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <Scan />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await openManualScan();

    const textInput = await screen.findByPlaceholderText("Enter product name");
    fireEvent.changeText(textInput, "Bread");
    fireEvent.press(await screen.findByText("Add to Inventory"));

    await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          "Success",
          "Bread added to your inventory!",
          expect.arrayContaining([
            expect.objectContaining({
              text: "OK",
              onPress: expect.any(Function)
            })
          ])
        );
      });
  });

  test("Can successfully increase the quantity of an item", async () => {
    api.addProduct.mockResolvedValue({
        success: true,
    });
    
    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <Scan />
        </NavigationContainer>
      </SafeAreaProvider>
    );
    
    await openManualScan();

    fireEvent.press(await screen.findByText("+"));
    expect(await screen.findByText("2")).toBeTruthy();
  });

  test("Can successfully decrease the quantity of an item", async () => {
    api.addProduct.mockResolvedValue({
        success: true,
    });
    
    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <Scan />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await openManualScan();
    
    fireEvent.press(await screen.findByText("+")); 
    expect(await screen.findByText("2")).toBeTruthy(); //Quantity should be 2
    fireEvent.press(await screen.findByText("−")); 
    expect(await screen.findByText("1")).toBeTruthy(); //Quantity should be 1
  });

  test("Can successfully scan valid barcodes", async () => {
    api.scanBarcode.mockResolvedValue({
        success: true,
        product: {
            product_name: "Bread"
        }
    });
    
    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <Scan />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    fireEvent.press(await screen.findByText("Start Scanning"));

    await simulateBarcodeScan();

    const textInput = await screen.findByPlaceholderText("Enter product name");
    expect(textInput.props.value).toBe("Bread");
  });

  test("Gracefully handles invalid barcode scans", async () => {
    api.scanBarcode.mockResolvedValue({
        success: false
    });
    
    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <Scan />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    fireEvent.press(await screen.findByText("Start Scanning"));

    await simulateBarcodeScan();

    await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
        "Product Not Found", 
        "Product not found. Would you like to enter details manually?",
          expect.arrayContaining([
            expect.objectContaining({
              text: "Yes",
              onPress: expect.any(Function)
            }),
            expect.objectContaining({
                text: "No",
                onPress: expect.any(Function)
              })
          ])
        );
      });

  });

  test("Handles exceptions during barcode scanning", async () => {
    api.scanBarcode.mockRejectedValue(new Error("Network error"));
    
    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <Scan />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    fireEvent.press(await screen.findByText("Start Scanning"));
  
    await simulateBarcodeScan();

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        "Error",
        "Failed to scan barcode. Please try again."
      );
    });
  });
});