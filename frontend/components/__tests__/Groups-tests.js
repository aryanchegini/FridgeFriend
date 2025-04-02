import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { Alert } from "react-native";
import Groups from '../../app/(tabs)/groups';
import * as api from "../../utils/api";
const mockAlert = jest.spyOn(Alert, "alert");

// Mock the API
jest.mock("../../utils/api");

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 50,
  BottomTabBarHeightContext: {
    Provider: ({ children }) => children,
  },
}));

// Mock group data
const mockGroups = [
  {
    groupName: "Test Group",
    groupCode: "ABC123",
    createdBy: "testuser",
    leaderboard: [
      { userID: "1", userName: "Chizoba", score: 300 },
      { userID: "2", userName: "Aryan", score: 250 },
      { userID: "3", userName: "Thamid", score: 200 },
    ],
  },
];

const newGroup = {
  groupName: "Test Group2",
  groupCode: "DEF123",
  createdBy: "testuser",
  leaderboard: [
    { userID: "1", userName: "testuser", score: 300 },
    { userID: "2", userName: "testuser2", score: 250 },
    { userID: "3", userName: "testuser3", score: 200 },
  ],
}

// Helper functions
const createGroup = async (groupName = "Test Group2") => {
  fireEvent.press(await screen.findByText("Create"));
  const textInput = await screen.findByPlaceholderText("Enter Group Name")
  fireEvent.changeText(textInput, groupName);
  fireEvent.press(await screen.findByTestId("create-group"));
  
  api.getGroups.mockResolvedValue({
    success: true,
    groups: [...mockGroups, newGroup],
  })

  await waitFor(() => {
    expect(api.getGroups).toHaveBeenCalledTimes(2);
  });

  expect(await screen.findByText(groupName, {}, {timeout: 3000})).toBeTruthy();
}

const joinGroup = async (groupCode = "DEF123") => {
  fireEvent.press(await screen.findByText("Join"));
  fireEvent.changeText(await screen.findByPlaceholderText("Enter Group Code"), groupCode);
  fireEvent.press(await screen.findByTestId("join-group"));
}

describe("Groups Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Displays fetched groups when API call succeeds", async () => {
    api.getGroups.mockResolvedValue({
      success: true,
      groups: mockGroups,
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <BottomTabBarHeightContext.Provider value={50}>
            <Groups />
          </BottomTabBarHeightContext.Provider>
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(api.getGroups).toHaveBeenCalledTimes(1);
    });

    const groupNameElement = await screen.findByText("Test Group");
    expect(groupNameElement).toBeTruthy();

    const element1 = await screen.findByText("Chizoba");
    const element2 = await screen.findByText("Aryan");
    const element3 = await screen.findByText("Thamid");

    expect(element1).toBeTruthy();
    expect(element2).toBeTruthy();
    expect(element3).toBeTruthy();
  });

  test("handles API error gracefully", async () => {
    api.getGroups.mockRejectedValue(new Error("Network error"));

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <BottomTabBarHeightContext.Provider value={50}>
            <Groups />
          </BottomTabBarHeightContext.Provider>
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch groups/i)).toBeTruthy();
    });
  });

  test("Can successfully create a group", async () => {
    api.getGroups.mockResolvedValueOnce({
      success: true,
      groups: mockGroups,
    });

    api.createGroup.mockResolvedValue({
      success: true,
      group: newGroup,
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <BottomTabBarHeightContext.Provider value={50}>
            <Groups />
          </BottomTabBarHeightContext.Provider>
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(api.getGroups).toHaveBeenCalledTimes(1);
    });

    await createGroup();
  });

 test("Can successfully join a group", async () => {
    api.getGroups.mockResolvedValue({
      success: true,
      groups: [...mockGroups, newGroup],
    });

    api.joinGroup.mockResolvedValue({
      success: true,
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <BottomTabBarHeightContext.Provider value={50}>
            <Groups />
          </BottomTabBarHeightContext.Provider>
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(api.getGroups).toHaveBeenCalledTimes(1);
    });

    await joinGroup();

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
      "Success", 
      "Joined the group successfully!"
    )});
  });

  test("Gracefully handles trying to join invalid groups", async () => {
    api.getGroups.mockResolvedValue({
      success: true,
      groups: mockGroups,
    });

    api.joinGroup.mockResolvedValue({
      success: false,
      message: "Invalid group ID"
    });

    render(
      <SafeAreaProvider>
        <NavigationContainer>
          <BottomTabBarHeightContext.Provider value={50}>
            <Groups />
          </BottomTabBarHeightContext.Provider>
        </NavigationContainer>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(api.getGroups).toHaveBeenCalledTimes(1);
    });

    await joinGroup();
 
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
      "Error", 
      "Invalid group ID"
    )});

  });

});