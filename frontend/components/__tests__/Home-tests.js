import React from "react";
import { render, waitFor, screen, fireEvent} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Alert } from "react-native";
import HomeScreen from "../../app/(tabs)/index";
import * as api from "../../utils/api";

// Mock the API
jest.mock("../../utils/api", () => ({
  getProducts: jest.fn(),
  deleteProduct: jest.fn(),
  updateProductStatus: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 50,
}));

jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
  // Simulate pressing the Delete button
  if (buttons && buttons[1]) {
    buttons[1].onPress && buttons[1].onPress();
  }
});

const mockItems = [
  {
    _id: "1",
    productName: "Bread",
    quantity: "1",
    dateOfExpiry: "2025-03-28",
    status: "not_expired"
  }
];

describe("Home Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Displays fetched items when API call succeeds", async () => {
    api.getProducts.mockResolvedValue({
      success: true,
      product: mockItems,
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(api.getProducts).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Bread")).toBeTruthy();
  });

  test("Marks product as consumed when consumed", async () => {
    api.getProducts.mockResolvedValue({
      success: true,
      product: mockItems,
    });

    api.updateProductStatus.mockResolvedValue({
      success: true,
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Bread")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("✅ Consumed"));

    // Wait for the API call to update product status
    await waitFor(() => {
      expect(api.updateProductStatus).toHaveBeenCalledWith("1", "consumed");
    });
  });

  test("Selected item disappears when deleted", async () => {
    api.getProducts.mockResolvedValueOnce({
      success: true,
      product: mockItems,
    });

    api.deleteProduct.mockResolvedValueOnce({
      success: true,
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Bread")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("🗑️ Delete"));

    await waitFor(() => {
      // Trigger a re-render to update the component state
      expect(api.getProducts).toHaveBeenCalledTimes(1);
    });

    // Wait and verify that bread was actually deleted
    await waitFor(() => {
      expect(screen.queryByText("Bread")).toBeNull();
    });
  });
  
});