import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getGroups, createGroup, joinGroup } from "../../utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { theme } from "../../constants/theme";
import { IconSymbol } from "@/components/ui/IconSymbol";

const { width } = Dimensions.get('window');

// Group type definition
type User = {
  userName: string;
  userID: string;
  score: number;
};

type Group = {
  groupName: string;
  groupCode: string;
  createdBy: string;
  leaderboard: User[];
};

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGroups();
      if (response.success) {
        setGroups(response.groups);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }

    try {
      const response = await createGroup(groupName);
      if (response.success) {
        Alert.alert("Success", `Group "${response.group.groupName}" created!`);
        setGroupName("");
        setCreateModalVisible(false);
        // Add the new group to the list
        setGroups((prevGroups) => [...prevGroups, response.group]);
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create group");
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert("Error", "Group code is required");
      return;
    }

    try {
      const response = await joinGroup(groupCode);
      if (response.success) {
        Alert.alert("Success", "Joined the group successfully!");
        setGroupCode("");
        setJoinModalVisible(false);
        // Refresh groups to show the newly joined group
        fetchGroups();
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to join group");
    }
  };

  // Render a single group card
  const renderGroupItem = ({ item }: { item: Group }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeaderRow}>
        <Text style={styles.groupName}>{item.groupName}</Text>
        <View style={styles.groupCodeContainer}>
          <Text style={styles.groupCodeLabel}>Code:</Text>
          <Text style={styles.groupCode}>{item.groupCode}</Text>
        </View>
      </View>
      
      <View style={styles.leaderboardContainer}>
        <Text style={styles.leaderboardTitle}>Leaderboard</Text>
        
        {item.leaderboard.length > 0 ? (
          item.leaderboard.map((user, index) => (
            <View key={user.userID || `user-${index}`} style={[styles.leaderboardItem, index < 3 && styles.topThreeItem]}>
              <View style={[styles.positionBadge, {
                backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#ffffff"
              }]}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>
              <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                {user.userName}
              </Text>
              <Text style={styles.score}>{user.score} pts</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No members yet</Text>
        )}
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="person.2.fill" size={50} color={theme.colors.secondary} />
      <Text style={styles.emptyText}>You haven't joined any groups yet</Text>
      <Text style={styles.emptySubText}>Create a new group or join with a code</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchGroups}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top || 16,
          paddingBottom: tabBarHeight || 16
        }
      ]}
    >
      <Text style={styles.title}>Groups</Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.groupCode}
        renderItem={renderGroupItem}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.listContent,
          groups.length === 0 && styles.emptyListContent
        ]}
      />

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.fab, styles.joinFab]} 
          onPress={() => setJoinModalVisible(true)}
        >
          <Text style={styles.fabText}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.fab, styles.createFab]} 
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.fabText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Create Group Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Group Name"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={30}
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleCreateGroup} testID="create-group">
              <Text style={styles.modalButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        visible={joinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Group</Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Group Code"
              value={groupCode}
              onChangeText={setGroupCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleJoinGroup} testID="join-group">
              <Text style={styles.modalButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f8f8",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: theme.colors.text,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    flex: 1,
  },
  groupCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  groupCodeLabel: {
    fontSize: 12,
    color: "#666",
    marginRight: 4,
  },
  groupCode: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  leaderboardContainer: {
    marginTop: 8,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: theme.colors.secondary,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topThreeItem: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  positionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  positionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  score: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    minWidth: 60,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 20,
    flexDirection: "row",
  },
  fab: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    paddingHorizontal: 20,
  },
  joinFab: {
    backgroundColor: theme.colors.secondary,
    marginRight: 10,
  },
  createFab: {
    backgroundColor: theme.colors.primary,
  },
  fabText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  closeButton: {
    fontSize: 22,
    color: "#999",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});